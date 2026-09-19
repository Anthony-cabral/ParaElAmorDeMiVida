import { mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const originalCommit = '58e6e170a077b1fed4040f23252bbdcacda6b46b';
const source = (
  process.env.ASSET_SOURCE_BASE ||
  `https://raw.githubusercontent.com/Anthony-cabral/ParaElAmorDeMiVida/${originalCommit}/public`
).replace(/\/$/, '');

const movies = JSON.parse(await readFile(path.join(root, 'data', 'movies.json'), 'utf8'));
const files = [
  'assets/images/forest.webp',
  'assets/images/lake.webp',
  'assets/images/cottage.webp',
  'assets/images/cinema.webp',
  'assets/images/bouquet.webp',
  ...movies.map(movie => movie.poster.replace(/^\//, ''))
];

for (const relative of [...new Set(files)]) {
  const destination = path.join(root, 'public', relative);

  await mkdir(path.dirname(destination), { recursive: true });

  try {
    const current = await stat(destination);
    if (current.size > 1000) {
      console.log(`OK ${relative}`);
      continue;
    }
  } catch {}

  const response = await fetch(`${source}/${relative}`, {
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${relative}: HTTP ${response.status}`);
  }

  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  console.log(`DESCARGADO ${relative}`);
}

console.log('Assets visuales listos. Se conservaron los originales del proyecto.');
