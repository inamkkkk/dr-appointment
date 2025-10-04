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
  port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10)};

logger.info(`Connecting BullMQ queues to Redis at ${connection.host}:${connection.port}`);

const summarizerQueue = new Queue('summarizerQueue', { connection });
const reminderQueue = new Queue('reminderQueue', { connection });
const sessionRefreshQueue = new Queue('sessionRefreshQueue', { connection });

// TODO: Implement logic to add jobs to the queues.
// This section is a placeholder for adding jobs. The example provided
// in the original file is commented out. If specific job adding logic
// is required for this module, it should be implemented here.
// For example:
/*
summarizerQueue.add('summarizeConversation', { conversationId: 'some_id' }, { delay: 5000 });
reminderQueue.add('sendReminder', { userId: 'user_123', message: 'Meeting in 1 hour' });
sessionRefreshQueue.add('refreshSession', { sessionId: 'session_abc' }, { repeat: { every: 3600000 } }); // Repeat every hour
*/

module.exports = {
  summarizerQueue,
  reminderQueue,
  sessionRefreshQueue};