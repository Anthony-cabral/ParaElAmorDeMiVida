import { DatabaseSync, backup } from 'node:sqlite';
import path from 'node:path';
import { ROOT } from '../server.js';
const dir=process.env.PRIVATE_DIR || path.join(ROOT,'private');
const db=new DatabaseSync(path.join(dir,'refugio.sqlite'));
const dest=path.join(dir,'backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
await backup(db,dest); db.close(); console.log('Copia consistente creada: '+dest);
