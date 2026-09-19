import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createMongoStore } from '../db.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const sqlitePath = path.resolve(process.argv[2] || path.join(root, 'private', 'refugio.sqlite'));

if (!existsSync(sqlitePath)) {
  console.error(`No existe: ${sqlitePath}`);
  process.exit(1);
}

const db = new DatabaseSync(sqlitePath, { readOnly: true });
const store = await createMongoStore(process.env);

try {
  const rows = db.prepare('SELECT movie_id, watched FROM progress').all();
  let migrated = 0;

  for (const row of rows) {
    await store.setProgress(row.movie_id, Boolean(row.watched));
    migrated++;
  }

  console.log(`Progreso migrado a MongoDB: ${migrated} registros.`);
} finally {
  db.close();
  await store.close();
}
