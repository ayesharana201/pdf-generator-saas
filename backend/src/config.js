require('dotenv').config();
const path = require('path');

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD)
) {
  throw new Error(
    'Production authentication requires JWT_SECRET and ADMIN_PASSWORD.'
  );
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

   jwtSecret: process.env.JWT_SECRET || '',
adminPassword: process.env.ADMIN_PASSWORD || '',
  adminSessionTtl: Number(process.env.ADMIN_SESSION_TTL || 28800),
  apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',

  outputDir: path.resolve(process.env.OUTPUT_DIR || './storage/output'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './storage/uploads'),
  dbFile: path.resolve(process.env.DB_FILE || './storage/db.json'),

  queueName: process.env.QUEUE_NAME || 'pdf-render-queue',
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 3),
  maxBatchSize: Number(process.env.MAX_BATCH_SIZE || 50),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 30),
  },
    quota: {
    monthlyLimit: Number(process.env.API_KEY_MONTHLY_LIMIT || 100),
    windowDays: Number(process.env.API_KEY_QUOTA_WINDOW_DAYS || 30),
  },
};
