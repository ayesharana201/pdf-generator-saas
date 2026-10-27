const express = require('express');
const fs = require('fs');
const router = express.Router();

const db = require('../storage/db');
const { renderQueue } = require('../queue/queue');

// GET /api/jobs â€” download history (most recent first)
router.get('/jobs', (req, res) => {
  let jobs = db.all('jobs');

  if (req.apiKeyRole !== 'admin') {
    if (req.authMethod === 'browser-session') {
      jobs = jobs.filter(
        (j) => j.browserSessionId === req.browserSessionId
      );
    } else {
      jobs = jobs.filter(
        (j) => j.apiKeyId === req.apiKeyId
      );
    }
  }

  jobs = jobs
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, Number(req.query.limit) || 100);

  res.json({ jobs });
});

// GET /api/jobs/:id ï¿½ poll status of a single job
router.get('/jobs/:id', (req, res) => {
  const job = db.findById('jobs', req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (req.apiKeyRole !== 'admin') {
  const ownsJob =
    req.authMethod === 'browser-session'
      ? job.browserSessionId === req.browserSessionId
      : job.apiKeyId === req.apiKeyId;

  if (!ownsJob) {
    return res.status(403).json({
      error: 'You do not have access to this job.',
    });
  }
}

  res.json({ job });
});

// GET /api/jobs/:id/download ï¿½ stream the finished PDF
router.get('/jobs/:id/download', (req, res) => {
  const job = db.findById('jobs', req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

if (req.apiKeyRole !== 'admin') {
  const ownsJob =
    req.authMethod === 'browser-session'
      ? job.browserSessionId === req.browserSessionId
      : job.apiKeyId === req.apiKeyId;

  if (!ownsJob) {
    return res.status(403).json({
      error: 'You do not have access to this job.',
    });
  }
}

  if (job.status !== 'completed' || !job.outputPath) {
    return res.status(409).json({
      error: `Job is not ready (status: ${job.status})`,
    });
  }

  if (!fs.existsSync(job.outputPath)) {
    return res.status(410).json({
      error: 'Output file no longer exists. Try regenerating.',
    });
  }

  db.update('jobs', job.id, {
    downloadCount: (job.downloadCount || 0) + 1,
    lastDownloadedAt: new Date().toISOString(),
  });

  res.download(
    job.outputPath,
    `${(job.title || 'document').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`
  );
});

// POST /api/jobs/:id/regenerate - re-run a previous job with the same inputs
router.post('/jobs/:id/regenerate', async (req, res) => {
  const job = db.findById('jobs', req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (req.apiKeyRole !== 'admin') {
    const ownsJob =
      req.authMethod === 'browser-session'
        ? job.browserSessionId === req.browserSessionId
        : job.apiKeyId === req.apiKeyId;

    if (!ownsJob) {
      return res.status(403).json({
        error: 'You do not have access to this job.',
      });
    }
  }

  const original = await renderQueue.getJob(job.id).catch(() => null);

  if (!original) {
    return res.status(410).json({
      error: 'Original job data expired; resubmit via /api/generate instead.',
    });
  }

  const { v4: uuidv4 } = require('uuid');
  const newJobId = uuidv4();

  const newData = {
    ...original.data,
    jobId: newJobId,
  };

  db.insert('jobs', {
    id: newJobId,
    sourceType: job.sourceType,
    title: job.title,
    status: 'queued',
    createdAt: new Date().toISOString(),
    templateId: job.templateId,
    regeneratedFrom: job.id,
    apiKeyId: job.apiKeyId || null,
    apiKeyOwner: job.apiKeyOwner || 'browser',
    browserSessionId: job.browserSessionId || null,
  });

  await renderQueue.add(
    'render',
    newData,
    {
      jobId: newJobId,
      attempts: 2,
    }
  );

  res.status(202).json({
    jobId: newJobId,
    status: 'queued',
    regeneratedFrom: job.id,
  });
});
module.exports = router;

