const { Queue, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');

// maxRetriesPerRequest must be null for BullMQ's blocking connections.
const connection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

const renderQueue = new Queue(config.queueName, { connection });

const queueEvents = new QueueEvents(config.queueName, { connection });

module.exports = { renderQueue, queueEvents, connection };
