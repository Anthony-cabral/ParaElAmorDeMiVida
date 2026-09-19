import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createGmailNotifier } from './notifications.js';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
export function preparePrivate(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const keyFile = path.join(dir, 'access.json');
  if (!existsSync(keyFile)) {
    const token = secret();
    writeFileSync(keyFile, JSON.stringify({ tokenHash: hash(token) }), { mode: 0o600 });
    writeFileSync(path.join(dir, 'invitation-token.txt'), token, { mode: 0o600 });
  }
  return JSON.parse(readFileSync(keyFile, 'utf8')).tokenHash;
}
export function createApp(options = {}) {
  const privateDir = path.resolve(options.privateDir || process.env.PRIVATE_DIR || path.join(ROOT, 'private'));
  const publicRoot = path.resolve(ROOT,'public').toLowerCase();
  if (privateDir.toLowerCase() === publicRoot || privateDir.toLowerCase().startsWith(publicRoot + path.sep)) throw new Error('PRIVATE_DIR debe estar fuera de public.');
  const tokenHash = preparePrivate(privateDir);
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const origin = (options.origin || process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  if (production && !origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN debe usar HTTPS en producción.');
  const db = new DatabaseSync(path.join(privateDir, 'refugio.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS progress(movie_id TEXT PRIMARY KEY, watched INTEGER NOT NULL CHECK(watched IN (0,1)), updated_at TEXT NOT NULL, watched_at TEXT);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS notices(session_id TEXT PRIMARY KEY, created INTEGER NOT NULL, status TEXT NOT NULL);
  `);
  // Existing sessions were created with a valid invitation; preserve their access.
  if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'collection_access')) {
    db.exec('ALTER TABLE sessions ADD COLUMN collection_access INTEGER NOT NULL DEFAULT 1');
  }
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  const movies = JSON.parse(readFileSync(path.join(ROOT, 'data/movies.json'), 'utf8'));
  const ids = new Set(movies.map(m => m.id));
  const limits = new Map();
  function limited(key, max, interval) {
    const now = Date.now(), old = limits.get(key);
    const entry = !old || old.until < now ? { count: 0, until: now + interval } : old;
    entry.count++; limits.set(key, entry);
    if (limits.size > 5000) for (const [k,v] of limits) if (v.until < now) limits.delete(k);
    return entry.count > max;
  }
  const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Formato no válido.'), { status: 415 });
    let value = '';
    for await (const chunk of req) { value += chunk; if (value.length > 4096) throw Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 }); }
    try { const parsed=JSON.parse(value); if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed))throw new Error(); return parsed; } catch { throw Object.assign(new Error('Solicitud no válida.'), { status: 400 }); }
  }
  const currentSession = req => {
    const raw = /(?:^|;\s*)refugio=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return raw ? db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(raw), Date.now()) : null;
  };
  const sendNotice = options.notify || createGmailNotifier();
  function makeSession(res, collectionAccess) {
    const raw = secret();
    const session = { id: hash(raw), csrf: secret(), expires: Date.now()+30*86400000, collection_access: Number(collectionAccess) };
    db.prepare('INSERT INTO sessions(id,csrf,expires,collection_access) VALUES(?,?,?,?)').run(session.id,session.csrf,session.expires,session.collection_access);
    res.setHeader('Set-Cookie', `refugio=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${production ? '; Secure' : ''}`);
    return session;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && url.pathname === '/healthz') return json(res,200,{ok:true});
      if (url.pathname.startsWith('/api/')) {
        if (!['GET','POST','PUT'].includes(req.method)) return json(res,405,{ error:'Método no permitido.' });
        if (req.method !== 'GET' && req.headers.origin !== origin) return json(res,403,{ error:'Origen no autorizado.' });
        if (req.method === 'GET' && url.pathname === '/api/session') {
          const session = currentSession(req);
          return json(res,200,{authenticated:Boolean(session?.collection_access),csrf:session?.csrf || null});
        }
        if (req.method === 'POST' && url.pathname === '/api/visitor-session') {
          if (limited('visitor-sessions',60,60000)) return json(res,429,{error:'Espera un momento antes de volver a entrar.'});
          await body(req);
          const session = currentSession(req) || makeSession(res,false);
          return json(res,200,{authenticated:Boolean(session.collection_access),csrf:session.csrf});
        }
        if (req.method === 'POST' && url.pathname === '/api/session') {
          if (limited('invitation-exchanges',30,60000)) return json(res,429,{error:'Espera un momento antes de volver a entrar.'});
          const input = await body(req);
          if (typeof input.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.token) || !timingSafeEqual(Buffer.from(hash(input.token)),Buffer.from(tokenHash))) return json(res,401,{error:'Este enlace no abre nuestro refugio.'});
          const session = currentSession(req) || makeSession(res,true);
          db.prepare('UPDATE sessions SET collection_access=1 WHERE id=?').run(session.id);
          return json(res,200,{authenticated:true,csrf:session.csrf});
        }
        const session = currentSession(req);
        if (!session) return json(res,401,{error:'Abre el enlace completo de nuestro cine para acceder a la colección.'});
        if (req.method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf) return json(res,403,{error:'Vuelve a abrir el refugio para guardar.'});
        if (req.method === 'POST' && url.pathname === '/api/adventure-start') {
          if (limited('start:'+session.id,10,60000)) return json(res,429,{error:'Espera un momento.'});
          const input = await body(req);
          if (input.action !== 'start' || Object.keys(input).length !== 1) return json(res,400,{error:'Solicitud no válida.'});
          if (db.prepare('SELECT 1 FROM notices WHERE session_id=?').get(session.id)) return json(res,200,{accepted:true});
          const cooldown = db.prepare("SELECT 1 FROM notices WHERE created>? AND status!='limited'").get(Date.now()-6*3600000);
          db.prepare('INSERT INTO notices VALUES(?,?,?)').run(session.id,Date.now(),cooldown?'limited':'pending');
          if (cooldown) return json(res,200,{accepted:true});
          let status;
          try { status = await sendNotice(); } catch { status = 'failed'; }
          db.prepare('UPDATE notices SET status=? WHERE session_id=?').run(status,session.id);
          return json(res,200,{accepted:true});
        }
        if (!session.collection_access) return json(res,403,{error:'Para nuestra colección, abre la invitación completa en este navegador.'});
        if (req.method === 'GET' && url.pathname === '/api/invitation') {
          const token = readFileSync(path.join(privateDir,'invitation-token.txt'),'utf8').trim();
          return json(res,200,{url:origin+'/#invite='+token});
        }
        if (req.method === 'GET' && url.pathname === '/api/movies') return json(res,200,{movies,progress:db.prepare('SELECT * FROM progress').all()});
        if (req.method === 'PUT' && url.pathname.startsWith('/api/progress/')) {
          if (limited(session.id,120,60000)) return json(res,429,{error:'Un momentito: prueba de nuevo.'});
          const id = url.pathname.slice('/api/progress/'.length), input = await body(req);
          if (!ids.has(id) || typeof input.watched !== 'boolean') return json(res,400,{error:'Película o estado no válido.'});
          const now = new Date().toISOString();
          db.prepare(`INSERT INTO progress VALUES(?,?,?,?) ON CONFLICT(movie_id) DO UPDATE SET watched=excluded.watched,updated_at=excluded.updated_at,watched_at=CASE WHEN excluded.watched=0 THEN NULL WHEN progress.watched=1 THEN progress.watched_at ELSE excluded.watched_at END`).run(id,Number(input.watched),now,input.watched ? now : null);
          return json(res,200,db.prepare('SELECT * FROM progress WHERE movie_id=?').get(id));
        }
        return json(res,404,{error:'No encontrado.'});
      }
      if (!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Método no permitido.'});
      let decoded;
      try { decoded = decodeURIComponent(url.pathname); } catch { return json(res,400,{error:'Ruta no válida.'}); }
      if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(p=>p.startsWith('.'))) return json(res,404,{error:'No encontrado.'});
      const publicDir = realpathSync(path.join(ROOT,'public'));
      const candidate = path.resolve(publicDir,'.'+ (decoded === '/' ? '/index.html' : decoded));
      if (!candidate.startsWith(publicDir+path.sep)) return json(res,404,{error:'No encontrado.'});
      let file; try { file = await stat(candidate); } catch { return json(res,404,{error:'No encontrado.'}); }
      if (!file.isFile() || !realpathSync(candidate).startsWith(publicDir+path.sep)) return json(res,404,{error:'No encontrado.'});
      const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
      res.setHeader('Content-Type',types[path.extname(candidate)] || 'application/octet-stream');
      if (decoded.startsWith('/assets/')) res.setHeader('Cache-Control','public, max-age=86400');
      res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : await readFile(candidate));
    } catch(error) { if(!res.headersSent) json(res,error.status || 500,{error:error.status ? error.message : 'No pudimos guardar este momento. Puedes volver a intentarlo.'}); else res.end(); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('close',()=>db.close());
  return {server,db,privateDir};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {server} = createApp();
  server.listen(Number(process.env.PORT || 3000),process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1'),()=>console.log('Refugio disponible. Ejecuta npm run invite para obtener el enlace privado.'));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
}
