// Target: armanin.ir ISIC product list (offset-based pagination).
export const config = {
  baseUrl: 'https://armanin.ir',
  listPath: '/fa/statistics/isic-code/products.html',
  startOffset: Number(process.env.START_OFFSET ?? 340),
  pageSize: 20,                        // site uses ?start=<offset>, step 20
  lastOffset: Number(process.env.LAST_OFFSET ?? 19800),
  maxPages: Number(process.env.MAX_PAGES ?? 10),

  // List table: table.table > tbody > tr, 4 cells:
  // [0]=code [1]=fName(+link) [2]=eName [3]=tariff
  selectors: {
    row: 'table.table tbody tr',
    rowLink: 'td:nth-child(2) a',
  },

  // Detail page: div.product > h1 (fa<br><small>en</small>), div.producttile > p labels
  followDetailPages: process.env.FOLLOW_DETAILS !== 'false',

  maxRequestsPerCrawl: Number(process.env.MAX_REQUESTS ?? 2000),
  minConcurrency: Number(process.env.MIN_CONCURRENCY ?? 2),
  maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? 4),

  proxyUrl: process.env.PROXY_URL || undefined,
};

export const CSV_COLUMNS = [
  'productUrl',
  'code',
  'name_fa',
  'name_en',
  'tariff',
  'unit',
  'description',
];