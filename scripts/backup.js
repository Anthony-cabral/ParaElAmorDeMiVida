import dotenv from 'dotenv';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createMongoStore } from '../db.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const store = await createMongoStore(process.env);
try {
  const documents = await store.exportAll();
  const dir = path.join(root, 'backups');
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `backup-mongo-${stamp}.json`);
  await writeFile(file, JSON.stringify(documents, null, 2));
  console.log(`Backup creado: ${file}`);
  console.log('No subas backups con datos de uso a GitHub.');
} finally {
  await store.close();
}
