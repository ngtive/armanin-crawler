import 'dotenv/config';
import { CheerioCrawler } from '@crawlee/cheerio';
import { Dataset } from '@crawlee/core';
import { config, CSV_COLUMNS } from './config.js';
import { exportToCsv, exportToJson } from './exporter.js';

const listUrl = (offset) => `${config.baseUrl}${config.listPath}?start=${offset}`;

// Guards against crawling the whole ~990-page archive.
let listPagesSeen = 0;

const crawler = new CheerioCrawler({
  ...(config.proxyUrl ? { proxyUrl: config.proxyUrl } : {}),
  maxRequestRetries: 3,
  maxRequestsPerCrawl: config.maxRequestsPerCrawl,
  minConcurrency: config.minConcurrency,
  maxConcurrency: config.maxConcurrency,

  async requestHandler({ $, request, addRequests, log }) {
    const { offset } = request.userData;

    // --- Detail page: labelled fields in .producttile p ---
    if (request.userData.item) {
      const labels = {};
      $('.producttile p').each((_, el) => {
        const raw = $(el).text().replace(/\s+/g, ' ').trim();
        const m = raw.match(/^([^:]+):\s*(.*)$/);
        if (m) labels[m[1].trim()] = m[2].trim();
      });

      const fa = $('.product h1').contents().filter(function () {
        return this.nodeType === 3;
      }).text().replace(/\s+/g, ' ').trim();
      const en = $('.product h1 small').first().text().trim();

      const item = {
        ...request.userData.item,
        name_fa: fa,
        name_en: en,
        unit: labels['واحد سنجش'] ?? '',
        description: labels['شرح محصول'] ?? '',
        tariff: labels['کد تعرفه'] || request.userData.item.tariff,
      };

      await Dataset.pushData([item]);
      log.info(`Detail -> ${item.code} ${item.name_fa}`);
      return;
    }

    // --- List page ---
    const items = [];
    $(config.selectors.row).each((_, el) => {
      const row = $(el);
      const link = row.find(config.selectors.rowLink).first();
      const href = link.attr('href');
      const cells = row.find('td').map((__, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
      if (!href) return;
      items.push({
        productUrl: new URL(href, config.baseUrl).href,
        code: cells[0] ?? '',
        name_fa: link.text().trim(),
        name_en: cells[2] ?? '',
        tariff: cells[3] ?? '',
      });
    });

    log.info(`List offset=${offset} -> ${items.length} items`);
    listPagesSeen += 1;

    if (config.followDetailPages) {
      await addRequests(items.map((item) => ({ url: item.productUrl, userData: { item } })));
    } else {
      await Dataset.pushData(items);
    }

    // Offset pagination: advance by pageSize until lastOffset / maxPages.
    const nextOffset = offset + config.pageSize;
    if (listPagesSeen >= config.maxPages) {
      log.info(`Reached MAX_PAGES=${config.maxPages}.`);
    } else if (nextOffset <= config.lastOffset) {
      await addRequests([{ url: listUrl(nextOffset), userData: { offset: nextOffset } }]);
    } else {
      log.info('Reached last offset; no further pages.');
    }
  },
});

await crawler.run([{ url: listUrl(config.startOffset), userData: { offset: config.startOffset } }]);

const dataset = await Dataset.open();
const all = await dataset.map((item) => item);
await exportToCsv(dataset, './storage/exports/products.csv', CSV_COLUMNS);
await exportToJson(dataset, './storage/exports/products.json');
console.log(`Done. ${all.length} products.`);