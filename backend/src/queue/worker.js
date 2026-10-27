/**
 * Standalone render worker.
 *
 * Run as its own process (`npm run worker`) so that heavy Puppeteer PDF
 * rendering never shares an event loop / memory space with the public
 * API server. Scale horizontally by starting more of these processes;
 * BullMQ + Redis handle fair distribution of queued jobs across them.
 */
const puppeteer = require('puppeteer');
const { Worker } = require('bullmq');
const config = require('./../config');
const { connection } = require('./queue');
const db = require('../storage/db');

const { markdownToHtml } = require('../converters/markdownToHtml');
const { rssToHtml } = require('../converters/rssToHtml');
const urlToHtml = require('../converters/urlToHtml');
const { renderPdf } = require('../utils/pdfRenderer');

let sharedBrowser = null;

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
  sharedBrowser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  sharedBrowser.on('disconnected', () => { sharedBrowser = null; });
  return sharedBrowser;
}

async function processJob(job) {
  const { jobId, sourceType, payload, brand, footer, title, subtitle } = job.data;
  db.update('jobs', jobId, { status: 'active', startedAt: new Date().toISOString() });

  const browser = await getBrowser();
  let converted;

  switch (sourceType) {
    case 'markdown':
      converted = markdownToHtml(payload.markdown);
      break;
    case 'rss':
      converted = await rssToHtml(payload.feedUrl, { maxItems: payload.maxItems });
      break;
    case 'url':
      converted = await urlToHtml(payload.url);
      break;
    default:
      throw new Error(`Unsupported sourceType: ${sourceType}`);
  }

  const resolvedTitle = title || converted.title || 'Generated Document';

  const outputPath = await renderPdf({
    browser,
    jobId,
    title: resolvedTitle,
    subtitle,
    bodyHtml: converted.html,
    headings: converted.headings,
    brand: brand || {},
    footer: footer || {},
  });

  db.update('jobs', jobId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    outputPath,
    downloadCount: 0,
  });

  return { outputPath };
}

function startWorker() {
  const worker = new Worker(
    config.queueName,
    async (job) => {
      try {
        return await processJob(job);
      } catch (err) {
        db.update('jobs', job.data.jobId, {
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: err.message,
        });
        throw err;
      }
    },
    { connection, concurrency: config.workerConcurrency }
  );

  worker.on('completed', (job) => {
    console.log(`[worker] job ${job.data.jobId} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.data?.jobId} failed:`, err.message);
  });

  process.on('SIGTERM', async () => {
    await worker.close();
    if (sharedBrowser) await sharedBrowser.close();
    process.exit(0);
  });

  console.log(`[worker] listening on queue "${config.queueName}" (concurrency=${config.workerConcurrency})`);
  return worker;
}

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker, processJob };



