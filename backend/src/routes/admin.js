const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const db = require('../storage/db');
const { renderQueue } = require('../queue/queue');
const { requireAdminSession } = require('../middleware/auth');
const { sendApiApprovalEmail } = require('../utils/email');

router.use(requireAdminSession);

router.get('/queue', async (req, res) => {
  const counts = await renderQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed'
  );

  const jobs = db.all('jobs');

  const last24h = jobs.filter(
    (j) =>
      Date.now() - new Date(j.createdAt).getTime() <
      24 * 3600 * 1000
  );

  res.json({
    queueCounts: counts,
    totalJobsAllTime: jobs.length,
    jobsLast24h: last24h.length,
    failedLast24h: last24h.filter(
      (j) => j.status === 'failed'
    ).length,
  });
});

router.get('/jobs', (req, res) => {
  let jobs = db
    .all('jobs')
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

  if (req.query.status) {
    jobs = jobs.filter(
      (j) => j.status === req.query.status
    );
  }

  res.json({
    jobs: jobs.slice(
      0,
      Number(req.query.limit) || 200
    ),
  });
});

router.post('/api-keys', (req, res) => {
  const { owner } = req.body;

  if (!owner) {
    return res.status(400).json({
      error: 'owner is required',
    });
  }

  const record = db.insert('apiKeys', {
    id: uuidv4(),
    key: `pdfgen_${uuidv4().replace(/-/g, '')}`,
    owner,
    role: 'integration',
    active: true,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    apiKey: record,
  });
});

router.get('/api-keys', (req, res) => {
  const apiKeys = db.all('apiKeys').map((k) => ({
    id: k.id,
    owner: k.owner,
    role: k.role || 'integration',
    key: `${k.key.slice(0, 14)}...`,
    active: k.active !== false,
    createdAt: k.createdAt,
    isCurrent: false,
  }));

  res.json({ apiKeys });
});

router.delete('/api-keys/:id', (req, res) => {
  const key = db.findById(
    'apiKeys',
    req.params.id
  );

  if (!key) {
    return res.status(404).json({
      error: 'API key not found',
    });
  }

  if (key.active === false) {
    return res.status(400).json({
      error: 'API key is already revoked.',
    });
  }

  db.update('apiKeys', req.params.id, {
    active: false,
  });

  res.status(204).end();
});
// POST /api/admin/api-access-requests/:id/approve
router.post('/api-access-requests/:id/approve', async (req, res) => {
  const request = db.findById(
    'apiAccessRequests',
    req.params.id
  );

  if (!request) {
    return res.status(404).json({
      error: 'API access request not found.',
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      error: `Request is already ${request.status}.`,
    });
  }

  const apiKey = db.insert('apiKeys', {
    id: uuidv4(),
    key: `pdfgen_${uuidv4().replace(/-/g, '')}`,
    owner: request.companyName,
    role: 'integration',
    active: true,
    createdAt: new Date().toISOString(),
  });

      db.update('apiAccessRequests', request.id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    apiKeyId: apiKey.id,
  });

  try {
    await sendApiApprovalEmail({
      companyName: request.companyName,
      requesterEmail: request.email,
      useCase: request.useCase,
      apiKey: apiKey.key,
    });
  } catch (emailError) {
    console.error('[email] Failed to send API approval email:', emailError.message);
  }

  res.json({
    success: true,
    message: 'API access request approved.',
    apiKey: apiKey.key,
  });
});

// POST /api/admin/api-access-requests/:id/reject
router.post('/api-access-requests/:id/reject', (req, res) => {
  const request = db.findById(
    'apiAccessRequests',
    req.params.id
  );

  if (!request) {
    return res.status(404).json({
      error: 'API access request not found.',
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      error: `Request is already ${request.status}.`,
    });
  }

  const rejectionReason =
    typeof req.body?.reason === 'string'
      ? req.body.reason.trim()
      : '';

  db.update('apiAccessRequests', request.id, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason,
  });

  res.json({
    success: true,
    message: 'API access request rejected.',
  });
});
module.exports = router;
// GET /api/admin/api-access-requests
router.get('/api-access-requests', (req, res) => {
  let requests = db
    .all('apiAccessRequests')
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

  if (req.query.status) {
    requests = requests.filter(
      (r) => r.status === req.query.status
    );
  }

  res.json({
    requests: requests.slice(
      0,
      Number(req.query.limit) || 100
    ),
  });
});