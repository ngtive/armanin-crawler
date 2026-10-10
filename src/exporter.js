import { createWriteStream, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { stringify } from 'csv-stringify';

/** Read every item from a Crawlee dataset. */
function readAll(dataset) {
  return dataset.map((item) => item);
}

/** Flush a Crawlee dataset to a CSV file. */
export async function exportToCsv(dataset, filePath, columns) {
  mkdirSync(dirname(filePath), { recursive: true });

  const items = await readAll(dataset);

  const stream = stringify({ header: true, columns });
  const out = createWriteStream(filePath);
  stream.pipe(out);
  for (const item of items) {
    stream.write(Object.fromEntries(columns.map((c) => [c, item[c] ?? ''])));
  }
  stream.end();

  await new Promise((res, rej) => {
    out.on('finish', res);
    out.on('error', rej);
  });

  console.log(`CSV written to ${resolve(filePath)} (${items.length} rows)`);
}

/** Write a Crawlee dataset to a pretty-printed JSON array file. */
export async function exportToJson(dataset, filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  const items = await readAll(dataset);
  await writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`JSON written to ${resolve(filePath)} (${items.length} items)`);
}