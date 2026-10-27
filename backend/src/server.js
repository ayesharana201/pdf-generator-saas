const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const db = require('./storage/db');
const {
  requireApiKey,
  requireBrowserSession,
} = require('./middleware/auth');

db.ensureDirs();

const app = express();

app.set('trust proxy', 1);

/*
 * Frontend runs on port 5173 while the API runs on port 4000.
 * Because the frontend sends credentials (including the admin
 * HttpOnly session cookie), CORS must use an explicit origin
 * instead of "*".
 */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header, such as direct
      // server-to-server requests and PowerShell testing.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Rate-limit the public API surface to prevent bulk-generation abuse
// (see "API misuse/abuse for bulk generation" risk in the project plan).
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pdf-generator-saas',
    time: new Date().toISOString(),
  });
});

const adminAuthRouter = require('./routes/adminAuth');
const apiAccessRouter = require('./routes/apiAccess');
const { requireAdminSession } = require('./middleware/auth');

app.use('/api', adminAuthRouter);
app.use('/api', apiAccessRouter);

// Admin API — authenticated with the HttpOnly admin session cookie.
app.use(
  '/api/admin',
  requireAdminSession,
  require('./routes/admin')
);

// Normal API — authenticated with x-api-key.
app.use('/api', (req, res, next) => {
  const apiKey = req.header(config.apiKeyHeader) || req.query.apiKey;

  if (apiKey) {
    return requireApiKey(req, res, next);
  }

  return requireBrowserSession(req, res, next);
}, require('./routes/generate'));

app.use('/api', (req, res, next) => {
  const apiKey = req.header(config.apiKeyHeader) || req.query.apiKey;

  if (apiKey) {
    return requireApiKey(req, res, next);
  }

  return requireBrowserSession(req, res, next);
}, require('./routes/jobs'));

app.use('/api', (req, res, next) => {
  const apiKey = req.header(config.apiKeyHeader) || req.query.apiKey;

  if (apiKey) {
    return requireApiKey(req, res, next);
  }

  return requireBrowserSession(req, res, next);
}, require('./routes/templates'));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(
    `[server] Professional PDF/eBook Generator API listening on port ${config.port}`
  );
  console.log(
    `[server] Run "npm run worker" in a separate process to start the Puppeteer render worker.`
  );
});

module.exports = app;


