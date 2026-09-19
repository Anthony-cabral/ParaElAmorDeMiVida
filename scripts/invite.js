import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const origin = (
  process.env.PUBLIC_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 3000}`
).replace(/\/$/, '');

console.log(origin);
console.log('El catálogo ya no necesita token de invitación.');
