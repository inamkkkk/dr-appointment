const { Queue } = require('bullmq');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

const connection = {
  host: process.env.QUEUE_REDIS_HOST || 'localhost',
  port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
};

logger.info(`Connecting BullMQ queues to Redis at ${connection.host}:${connection.port}`);

const summarizerQueue = new Queue('summarizerQueue', { connection });
const reminderQueue = new Queue('reminderQueue', { connection });
const sessionRefreshQueue = new Queue('sessionRefreshQueue', { connection });

// Add a job to a queue example
// summarizerQueue.add('summarizeConversation', { conversationId: 'some_id' });

module.exports = {
  summarizerQueue,
  reminderQueue,
  sessionRefreshQueue,
};
