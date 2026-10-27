const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require('../storage/db');
const config = require('../config');
const { renderQueue } = require('../queue/queue');
const { checkQuota } = require('../middleware/auth');

const VALID_SOURCE_TYPES = ['markdown', 'rss', 'url'];

function buildJobPayload(sourceType, body) {
  switch (sourceType) {
    case 'markdown':
      if (!body.markdown) {
        throw new Error(
          'markdown is required for sourceType "markdown"'
        );
      }

      return { markdown: body.markdown };

    case 'rss':
      if (!body.feedUrl) {
        throw new Error(
          'feedUrl is required for sourceType "rss"'
        );
      }

      return {
        feedUrl: body.feedUrl,
        maxItems: body.maxItems || 25,
      };

    case 'url':
      if (!body.url) {
        throw new Error(
          'url is required for sourceType "url"'
        );
      }

      return { url: body.url };

    default:
      throw new Error(
        `Unsupported sourceType "${sourceType}". Use one of: ${VALID_SOURCE_TYPES.join(', ')}`
      );
  }
}

async function enqueueOne(body, req) {
  const { sourceType, title, subtitle, templateId } = body;

  if (!VALID_SOURCE_TYPES.includes(sourceType)) {
    throw new Error(
      `sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`
    );
  }

  const payload = buildJobPayload(sourceType, body);

  let brand = body.brand || {};
  let footer = body.footer || {};

  if (templateId) {
    const template = db.findById('templates', templateId);

    if (template) {
      brand = { ...template.brand, ...brand };
      footer = { ...template.footer, ...footer };
    }
  }

  const jobId = uuidv4();

  db.insert('jobs', {
  id: jobId,
  sourceType,
  title: title || null,
  status: 'queued',
  createdAt: new Date().toISOString(),
  templateId: templateId || null,
  apiKeyId: req.apiKeyId || null,
  apiKeyOwner: req.apiKeyOwner || 'browser',
  browserSessionId: req.browserSessionId || null,
});

  await renderQueue.add(
    'render',
    {
      jobId,
      sourceType,
      payload,
      brand,
      footer,
      title,
      subtitle,
    },
    {
      jobId,
      removeOnComplete: false,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    }
  );

  return jobId;
}

/**
 * Consume quota after a generation job has been successfully
 * created and queued.
 *
 * Admin keys are unlimited.
 */
function consumeQuota(req, units = 1) {
  if (req.apiKeyRole === 'admin' || req.authMethod === 'browser-session') {
    return;
  }

  const key = db.findById('apiKeys', req.apiKeyId);

  if (!key) {
    throw new Error('API key not found.');
  }

  const now = Date.now();
  const windowDays = config.quota.windowDays;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  let usageCount = Number(key.usageCount || 0);
  let usageStartedAt = key.usageStartedAt
    ? new Date(key.usageStartedAt).getTime()
    : now;

  if (!Number.isFinite(usageStartedAt)) {
    usageStartedAt = now;
  }

  if (now - usageStartedAt >= windowMs) {
    usageCount = 0;
    usageStartedAt = now;
  }

  db.update('apiKeys', req.apiKeyId, {
    usageCount: usageCount + units,
    usageStartedAt: new Date(usageStartedAt).toISOString(),
    monthlyLimit: Number(
      key.monthlyLimit || config.quota.monthlyLimit
    ),
  });
}

// POST /api/generate — single document
router.post('/generate', checkQuota(1), async (req, res) => {
  try {
    const jobId = await enqueueOne(req.body, req);

    consumeQuota(req, 1);

    res.status(202).json({
      jobId,
      status: 'queued',
      statusUrl: `/api/jobs/${jobId}`,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

// POST /api/generate/batch — bulk/batch generation
// body: { items: [ { sourceType, ... }, ... ] }
router.post('/generate/batch', async (req, res) => {
  const items = req.body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'items must be a non-empty array',
    });
  }

  if (items.length > config.maxBatchSize) {
    return res.status(400).json({
      error: `Batch too large. Max ${config.maxBatchSize} items per request.`,
    });
  }

  // Check the entire batch before creating any jobs.
  if (req.apiKeyRole !== 'admin') {
    const key = db.findById('apiKeys', req.apiKeyId);

    if (!key) {
      return res.status(401).json({
        error: 'API key not found.',
      });
    }

    const now = Date.now();
    const windowDays = config.quota.windowDays;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    let usageCount = Number(key.usageCount || 0);
    let usageStartedAt = key.usageStartedAt
      ? new Date(key.usageStartedAt).getTime()
      : now;

    if (!Number.isFinite(usageStartedAt)) {
      usageStartedAt = now;
    }

    if (now - usageStartedAt >= windowMs) {
      usageCount = 0;
      usageStartedAt = now;
    }

    const monthlyLimit = Number(
      key.monthlyLimit || config.quota.monthlyLimit
    );

    const remaining = Math.max(
      0,
      monthlyLimit - usageCount
    );

    if (items.length > remaining) {
      return res.status(429).json({
        error: 'API key quota exceeded.',
        requested: items.length,
        usage: usageCount,
        limit: monthlyLimit,
        remaining,
      });
    }
  }

  const results = [];

  for (const item of items) {
    try {
      const jobId = await enqueueOne(item, req);

      results.push({
        jobId,
        status: 'queued',
      });
    } catch (err) {
      results.push({
        error: err.message,
        item,
      });
    }
  }

  // Only charge for jobs that were actually queued.
  const successfulJobs = results.filter(
    (result) => result.jobId
  ).length;

  if (successfulJobs > 0) {
    consumeQuota(req, successfulJobs);
  }

  res.status(202).json({
    batchSize: items.length,
    queuedCount: successfulJobs,
    results,
  });
});

module.exports = router;