import { preparePrivate, ROOT } from '../server.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const dir=process.env.PRIVATE_DIR || path.join(ROOT,'private');
preparePrivate(dir);
const token=readFileSync(path.join(dir,'invitation-token.txt'),'utf8').trim();
console.log('\nComparte este mismo enlace solo con tu pareja:\n'+(process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/,'')+'/#invite='+token+'\n');
