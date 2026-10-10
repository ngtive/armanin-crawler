# armanin-crawler

Crawlee crawler for the **armanin.ir** ISIC product list.

Source: `https://armanin.ir/fa/statistics/isic-code/products.html?start=340`

## How the site paginates

Offset-based: `?start=<offset>` with a step of **20**. There is no "next" link to
click through reliably, so the crawler computes the next offset itself
(`src/main.js:73`) and stops at `LAST_OFFSET` (19800 ≈ 991 pages, ~19,800 products).

Each list row is a 4-column table row:

| Code | fName (link) | eName | tariff |
|------|--------------|-------|--------|

Detail pages (`/fa/statistics/isic-code/product/<id>.html`) add `unit` and
`description` from the labelled `<p>` tags in `.producttile`.

## Install

```bash
npm install
cp .env.example .env
```

## Run

```bash
npm start
```

Outputs land in `storage/exports/`:

- `products.csv` — `code, name_fa, name_en, unit, description`
- `products.json` — same data, pretty-printed

## Scripts

`scripts/drop-column.mjs` removes column(s) from the exported files in place
(atomic write, handles quoted CSV fields):

```bash
node scripts/drop-column.mjs --dry tariff      # preview
node scripts/drop-column.mjs tariff            # apply
node scripts/drop-column.mjs tariff code       # multiple
```

Only touches `storage/exports/products.{csv,json}` — Crawlee's own
`storage/datasets` state is left alone.

## Configuration

Everything is env-driven (see `.env.example`). The most useful ones:

| Var | Default | Notes |
|-----|---------|-------|
| `START_OFFSET` | `340` | First offset to fetch |
| `LAST_OFFSET` | `19800` | Last offset; traversal stops past this |
| `MAX_PAGES` | `10` | Safety cap on list pages (full site is ~991) |
| `FOLLOW_DETAILS` | `true` | `false` = list data only, ~20x fewer requests |
| `MAX_REQUESTS` | `2000` | Hard cap on total HTTP requests |
| `MAX_CONCURRENCY` | `4` | Lower this to be gentler on the server |
| `PROXY_URL` | – | Optional proxy |

Selectors and URLs live in `src/config.js`.

### Full crawl

The whole archive is ~991 list pages / ~19,800 detail pages. Run it with:

```bash
MAX_PAGES=991 FOLLOW_DETAILS=true MAX_REQUESTS=20000 MAX_CONCURRENCY=4 npm start
```

## Files

- `src/config.js` — URL, offsets, selectors, CSV column order
- `src/main.js` — crawler: list parsing, detail enrichment, offset pagination
- `src/exporter.js` — dataset → CSV/JSON
- `scripts/drop-column.mjs` — drop columns from the exported files

## Notes

- `robots.txt` permits `/fa/statistics/` (only `/administrator/`, `/components/`,
  etc. are disallowed).
- Concurrent requests are capped at 4 by default; raise it only if you have
  permission to load the site that hard.