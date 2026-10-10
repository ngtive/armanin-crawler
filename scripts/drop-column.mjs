#!/usr/bin/env node
/**
 * Drop one or more columns from the exported products.csv / products.json in place.
 *
 * Usage:
 *   node scripts/drop-column.mjs tariff
 *   node scripts/drop-column.mjs tariff productUrl
 *   node scripts/drop-column.mjs --dry tariff
 */
import { readFile, writeFile, rename } from 'node:fs/promises';

const JSON_PATH = 'storage/exports/products.json';
const CSV_PATH = 'storage/exports/products.csv';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const drop = args.filter((a) => !a.startsWith('--'));

if (drop.length === 0) {
  console.error('No columns given. Usage: node scripts/drop-column.mjs <column> [column...]');
  process.exit(1);
}

const write = async (path, text) => {
  if (dry) return;
  const tmp = `${path}.tmp`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, path); // atomic replace
};

// --- JSON ---
const items = JSON.parse(await readFile(JSON_PATH, 'utf8'));
let jsonTouched = 0;
for (const it of items) {
  for (const col of drop) {
    if (col in it) {
      delete it[col];
      jsonTouched += 1;
    }
  }
}
await write(JSON_PATH, JSON.stringify(items, null, 2));
console.log(`JSON: removed [${drop.join(', ')}] from ${jsonTouched} field(s) across ${items.length} items`);

// --- CSV ---

// Proper CSV parser: handles quoted fields containing commas and newlines.
function parseCsv(text) {
  const out = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); out.push(row); row = []; field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out.filter((r) => r.length && !(r.length === 1 && r[0] === ''));
}

const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const parsed = parseCsv(await readFile(CSV_PATH, 'utf8'));
const cols = parsed[0];
const dropIdx = new Set(drop.map((c) => cols.indexOf(c)).filter((i) => i !== -1));

if (dropIdx.size === 0) {
  console.log(`CSV: none of [${drop.join(', ')}] present in header ${cols.join(',')}`);
} else {
  const keep = cols.map((_, i) => i).filter((i) => !dropIdx.has(i));
  const keptCols = cols.filter((_, i) => !dropIdx.has(i));
  const body = parsed.slice(1).map((r) => keep.map((i) => esc(r[i] ?? '')).join(','));
  await write(CSV_PATH, [keptCols.join(','), ...body, ''].join('\n'));
  console.log(`CSV: removed [${[...dropIdx].map((i) => cols[i]).join(', ')}] from ${body.length} rows`);
}

console.log(dry ? 'Dry run - no files written.' : 'Done.');