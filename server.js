import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import {
  createGmailNotifier
} from './notifications.js';

import {
  createMongoStore
} from './db.js';

export const ROOT=
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

dotenv.config({
  path:
    path.join(
      ROOT,
      '.env'
    ),

  quiet:true
});

const ORIGINAL_ASSET_COMMIT=
  '58e6e170a077b1fed4040f23252bbdcacda6b46b';

const ASSET_SOURCE_BASE=
  (
    process.env.ASSET_SOURCE_BASE||

    `https://raw.githubusercontent.com/Anthony-cabral/ParaElAmorDeMiVida/${ORIGINAL_ASSET_COMMIT}/public`
  )
  .replace(
    /\/$/,
    ''
  );

export async function createApp(
  options={}
){
  const production=
    options.production??
    process.env.NODE_ENV==='production';

  const origin=
    (
      options.origin||
      process.env.PUBLIC_ORIGIN||
      process.env.RENDER_EXTERNAL_URL||
      `http://localhost:${process.env.PORT||3000}`
    )
    .replace(
      /\/$/,
      ''
    );

  if(
    production &&
    !origin.startsWith('https://')
  ){
    throw new Error(
      'PUBLIC_ORIGIN debe usar HTTPS en producción.'
    );
  }

  const publicDir=
    realpathSync(
      path.join(
        ROOT,
        'public'
      )
    );

  const store=
    options.store||
    await createMongoStore(
      process.env
    );

  const sendNotice=
    options.notify||
    createGmailNotifier();

  const movies=
    JSON.parse(
      readFileSync(
        path.join(
          ROOT,
          'data/movies.json'
        ),
        'utf8'
      )
    );

  const ids=
    new Set(
      movies.map(
        movie=>movie.id
      )
    );

  const limits=
    new Map();

  function limited(
    key,
    max,
    interval
  ){
    const now=
      Date.now();

    const old=
      limits.get(key);

    const entry=
      !old||
      old.until<now

        ?{
            count:0,
            until:
              now+interval
          }

        :old;

    entry.count++;

    limits.set(
      key,
      entry
    );

    if(
      limits.size>5000
    ){
      for(
        const[
          k,
          value
        ]
        of limits
      ){
        if(
          value.until<now
        ){
          limits.delete(k);
        }
      }
    }

    return(
      entry.count>max
    );
  }

  const json=(
    res,
    code,
    data
  )=>{
    res.writeHead(
      code,
      {
        'Content-Type':
          'application/json; charset=utf-8'
      }
    );

    res.end(
      JSON.stringify(
        data
      )
    );
  };

  async function body(req){
    if(
      !req.headers[
        'content-type'
      ]
      ?.startsWith(
        'application/json'
      )
    ){
      throw Object.assign(
        new Error(
          'Formato no válido.'
        ),
        {
          status:415
        }
      );
    }

    let value='';

    for await(
      const chunk
      of req
    ){
      value+=chunk;

      if(
        value.length>4096
      ){
        throw Object.assign(
          new Error(
            'Solicitud demasiado grande.'
          ),
          {
            status:413
          }
        );
      }
    }

    try{
      const parsed=
        JSON.parse(
          value
        );

      if(
        !parsed||
        typeof parsed!=='object'||
        Array.isArray(parsed)
      ){
        throw new Error();
      }

      return parsed;
    }
    catch{
      throw Object.assign(
        new Error(
          'Solicitud no válida.'
        ),
        {
          status:400
        }
      );
    }
  }

  async function currentSession(
    req
  ){
    const raw=
      /(?:^|;\s*)refugio=([A-Za-z0-9_-]{43})(?:;|$)/
        .exec(
          req.headers.cookie||
          ''
        )?.[1];

    return raw
      ?store.getSession(raw)
      :null;
  }

  async function makeSession(
    res
  ){
    const{
      raw,
      session
    }=
      await store.createSession();

    res.setHeader(
      'Set-Cookie',

      `refugio=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${production?'; Secure':''}`
    );

    return session;
  }

  async function remoteAsset(
    decoded,
    req,
    res
  ){
    if(
      !decoded.startsWith(
        '/assets/'
      )||

      !/\.(?:webp|jpg|jpeg|png)$/i
        .test(decoded)
    ){
      return false;
    }

    try{
      const response=
        await fetch(
          `${ASSET_SOURCE_BASE}${decoded}`,

          {
            method:
              req.method==='HEAD'
                ?'HEAD'
                :'GET',

            signal:
              AbortSignal.timeout(
                12000
              )
          }
        );

      if(
        !response.ok
      ){
        return false;
      }

      const fallbackTypes={
        '.webp':'image/webp',
        '.jpg':'image/jpeg',
        '.jpeg':'image/jpeg',
        '.png':'image/png'
      };

      res.setHeader(
        'Content-Type',

        response.headers.get(
          'content-type'
        )||

        fallbackTypes[
          path.extname(
            decoded
          )
        ]||

        'application/octet-stream'
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=86400'
      );

      res.writeHead(200);

      if(
        req.method==='HEAD'
      ){
        res.end();
        return true;
      }

      res.end(
        Buffer.from(
          await response.arrayBuffer()
        )
      );

      return true;
    }
    catch{
      return false;
    }
  }

  const server=
    createServer(
      async(
        req,
        res
      )=>{
        res.setHeader(
          'Referrer-Policy',
          'no-referrer'
        );

        res.setHeader(
          'X-Content-Type-Options',
          'nosniff'
        );

        res.setHeader(
          'X-Frame-Options',
          'DENY'
        );

        res.setHeader(
          'Cache-Control',
          'no-store'
        );

        res.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=()'
        );

        res.setHeader(
          'Content-Security-Policy',

          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        );

        if(production){
          res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000'
          );
        }

        try{
          const url=
            new URL(
              req.url,
              origin
            );

          if(
            req.method==='GET' &&
            url.pathname==='/healthz'
          ){
            return json(
              res,
              200,
              {
                ok:true,
                database:'mongodb'
              }
            );
          }

          if(
            url.pathname
              .startsWith(
                '/api/'
              )
          ){
            if(
              ![
                'GET',
                'POST',
                'PUT'
              ]
              .includes(
                req.method
              )
            ){
              return json(
                res,
                405,
                {
                  error:
                    'Método no permitido.'
                }
              );
            }

            if(
              req.method!=='GET' &&
              req.headers.origin!==origin
            ){
              return json(
                res,
                403,
                {
                  error:
                    'Origen no autorizado.'
                }
              );
            }

            if(
              req.method==='GET' &&
              url.pathname==='/api/session'
            ){
              const session=
                await currentSession(
                  req
                );

              return json(
                res,
                200,
                {
                  authenticated:
                    Boolean(
                      session
                    ),

                  csrf:
                    session?.csrf||
                    null
                }
              );
            }

            if(
              req.method==='POST' &&
              url.pathname==='/api/visitor-session'
            ){
              if(
                limited(
                  'visitor-sessions',
                  60,
                  60000
                )
              ){
                return json(
                  res,
                  429,
                  {
                    error:
                      'Espera un momento antes de volver a entrar.'
                  }
                );
              }

              await body(req);

              const session=
                await currentSession(
                  req
                )||
                await makeSession(
                  res
                );

              return json(
                res,
                200,
                {
                  authenticated:true,
                  csrf:session.csrf
                }
              );
            }

            const session=
              await currentSession(
                req
              );

            if(!session){
              return json(
                res,
                401,
                {
                  error:
                    'Vuelve a abrir el refugio para continuar.'
                }
              );
            }

            if(
              req.method!=='GET' &&

              req.headers[
                'x-csrf-token'
              ]!==session.csrf
            ){
              return json(
                res,
                403,
                {
                  error:
                    'Vuelve a abrir el refugio para guardar.'
                }
              );
            }

            /*
              NOTIFICACIONES DE CLICS
              Y ENTRADA AL CATÁLOGO
            */

            if(
              req.method==='POST' &&
              url.pathname==='/api/activity'
            ){
              if(
                limited(
                  'activity:'+
                    session.sessionId,

                  60,
                  60000
                )
              ){
                return json(
                  res,
                  429,
                  {
                    error:
                      'Demasiadas interacciones.'
                  }
                );
              }

              const input=
                await body(req);

              const allowedScenes=
                new Set([
                  'entry',
                  'path',
                  'lake',
                  'cottage',
                  'cinema',
                  'catalog',
                  'garden'
                ]);

              if(
                typeof input.scene!=='string' ||

                !allowedScenes.has(
                  input.scene
                )||

                typeof input.button!=='string'
              ){
                return json(
                  res,
                  400,
                  {
                    error:
                      'Actividad no válida.'
                  }
                );
              }

              const clean=(
                value,
                max=100
              )=>
                typeof value==='string'

                  ?value
                    .replace(
                      /\s+/g,
                      ' '
                    )
                    .trim()
                    .slice(
                      0,
                      max
                    )

                  :'';

              const status=
                await sendNotice({
                  scene:
                    input.scene,

                  button:
                    clean(
                      input.button,
                      120
                    ),

                  device:
                    clean(
                      input.device,
                      100
                    ),

                  platform:
                    clean(
                      input.platform,
                      100
                    ),

                  browser:
                    clean(
                      input.browser,
                      100
                    )
                });

              return json(
                res,
                200,
                {
                  accepted:true,
                  status
                }
              );
            }

            /*
              RUTA ANTIGUA.
              SE MANTIENE PARA
              COMPATIBILIDAD.
            */

            if(
              req.method==='POST' &&
              url.pathname==='/api/adventure-start'
            ){
              const input=
                await body(req);

              if(
                input.action!=='start'
              ){
                return json(
                  res,
                  400,
                  {
                    error:
                      'Solicitud no válida.'
                  }
                );
              }

              const status=
                await sendNotice({
                  scene:'entry',
                  button:
                    'Empezar mi pequeña aventura'
                });

              return json(
                res,
                200,
                {
                  accepted:true,
                  status
                }
              );
            }

            if(
              req.method==='GET' &&
              url.pathname==='/api/invitation'
            ){
              return json(
                res,
                200,
                {
                  url:origin
                }
              );
            }

            if(
              req.method==='GET' &&
              url.pathname==='/api/movies'
            ){
              return json(
                res,
                200,
                {
                  movies,

                  progress:
                    await store.getProgress()
                }
              );
            }

            if(
              req.method==='PUT' &&
              url.pathname
                .startsWith(
                  '/api/progress/'
                )
            ){
              if(
                limited(
                  session.sessionId,
                  120,
                  60000
                )
              ){
                return json(
                  res,
                  429,
                  {
                    error:
                      'Un momentito: prueba de nuevo.'
                  }
                );
              }

              const id=
                url.pathname.slice(
                  '/api/progress/'.length
                );

              const input=
                await body(req);

              if(
                !ids.has(id)||
                typeof input.watched!=='boolean'
              ){
                return json(
                  res,
                  400,
                  {
                    error:
                      'Película o estado no válido.'
                  }
                );
              }

              return json(
                res,
                200,
                await store.setProgress(
                  id,
                  input.watched
                )
              );
            }

            return json(
              res,
              404,
              {
                error:
                  'No encontrado.'
              }
            );
          }

          if(
            ![
              'GET',
              'HEAD'
            ]
            .includes(
              req.method
            )
          ){
            return json(
              res,
              405,
              {
                error:
                  'Método no permitido.'
              }
            );
          }

          let decoded;

          try{
            decoded=
              decodeURIComponent(
                url.pathname
              );
          }
          catch{
            return json(
              res,
              400,
              {
                error:
                  'Ruta no válida.'
              }
            );
          }

          if(
            decoded.includes(
              '\\'
            )||

            decoded.includes(
              '\0'
            )||

            decoded
              .split('/')
              .some(
                part=>
                  part.startsWith('.')
              )
          ){
            return json(
              res,
              404,
              {
                error:
                  'No encontrado.'
              }
            );
          }

          const candidate=
            path.resolve(
              publicDir,

              '.'+
              (
                decoded==='/'
                  ?'/index.html'
                  :decoded
              )
            );

          if(
            !candidate.startsWith(
              publicDir+
              path.sep
            )
          ){
            return json(
              res,
              404,
              {
                error:
                  'No encontrado.'
              }
            );
          }

          let file;

          try{
            file=
              await stat(
                candidate
              );
          }
          catch{
            if(
              await remoteAsset(
                decoded,
                req,
                res
              )
            ){
              return;
            }

            return json(
              res,
              404,
              {
                error:
                  'No encontrado.'
              }
            );
          }

          if(
            !file.isFile()||

            !realpathSync(
              candidate
            )
            .startsWith(
              publicDir+
              path.sep
            )
          ){
            return json(
              res,
              404,
              {
                error:
                  'No encontrado.'
              }
            );
          }

          const types={
            '.html':
              'text/html; charset=utf-8',

            '.css':
              'text/css; charset=utf-8',

            '.js':
              'text/javascript; charset=utf-8',

            '.svg':
              'image/svg+xml',

            '.webp':
              'image/webp',

            '.jpg':
              'image/jpeg',

            '.jpeg':
              'image/jpeg',

            '.png':
              'image/png',

            '.mp3':
              'audio/mpeg'
          };

          res.setHeader(
            'Content-Type',

            types[
              path.extname(
                candidate
              )
            ]||

            'application/octet-stream'
          );

          if(
            decoded.startsWith(
              '/assets/'
            )
          ){
            res.setHeader(
              'Cache-Control',
              'public, max-age=86400'
            );
          }

          res.writeHead(200);

          res.end(
            req.method==='HEAD'
              ?undefined
              :await readFile(
                  candidate
                )
          );
        }
        catch(error){
          if(
            !res.headersSent
          ){
            json(
              res,

              error.status||
              500,

              {
                error:
                  error.status
                    ?error.message
                    :'No pudimos guardar este momento. Puedes volver a intentarlo.'
              }
            );
          }
          else{
            res.end();
          }
        }
      }
    );

  server.requestTimeout=
    20000;

  server.headersTimeout=
    10000;

  server.on(
    'close',

    ()=>
      void store.close()
  );

  return{
    server,
    store,
    origin
  };
}

if(
  process.argv[1] &&

  path.resolve(
    process.argv[1]
  )===

  fileURLToPath(
    import.meta.url
  )
){
  try{
    const{
      server
    }=
      await createApp();

    server.listen(
      Number(
        process.env.PORT||
        3000
      ),

      process.env.HOST||
      (
        process.env.RENDER
          ?'0.0.0.0'
          :'127.0.0.1'
      ),

      ()=>{
        console.log(
          'Refugio disponible. Persistencia: MongoDB. Catálogo: acceso directo.'
        );
      }
    );

    for(
      const signal
      of[
        'SIGINT',
        'SIGTERM'
      ]
    ){
      process.on(
        signal,

        ()=>
          server.close(
            ()=>
              process.exit(0)
          )
      );
    }
  }
  catch(error){
    console.error(
      'No se pudo iniciar el servidor:',
      error.message
    );

    process.exit(1);
  }
}