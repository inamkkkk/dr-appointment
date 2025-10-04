const { Worker } = require('bullmq');
const { initWhatsappClient, getWhatsappClient } = require('../src/services/whatsappService');
const Doctor = require('../src/models/Doctor');
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

const sessionRefreshWorker = new Worker(
  'sessionRefreshQueue',
  async (job) => {
    const { sessionId, doctorId } = job.data;
    logger.info(`Processing session refresh job for session: ${sessionId || doctorId}`);

    try {
      // For whatsapp-web.js, session refresh usually means re-initializing if disconnected
      // or ensuring the client is still connected.

      let client = getWhatsappClient();

      if (!client || !client.isReady) {
        logger.info(`WhatsApp client for session ${sessionId || doctorId} not ready or disconnected. Attempting re-initialization.`);
        await initWhatsappClient(sessionId);
        client = getWhatsappClient(); // Get the newly initialized client
      }

      if (client && client.isReady) {
        logger.info(`WhatsApp client for session ${sessionId || doctorId} is ready and healthy.`);
        // Optionally, perform a lightweight check, e.g., get contacts
        // const contacts = await client.getContacts();
        // logger.debug(`Client for session ${sessionId} has ${contacts.length} contacts.`);
      } else {
        logger.error(`Failed to refresh or reconnect WhatsApp client for session ${sessionId || doctorId}.`);
        // TODO: Notify admin, trigger a manual re-scan QR flow
      }

      // TODO: Implement session rotation logic if using multiple WhatsApp instances/numbers
      // This might involve fetching a new session from a pool or creating a new one.
      logger.info(`Session refresh for ${sessionId || doctorId} complete.`);
    } catch (error) {
      logger.error(`Error in session refresh worker for job ${job.id}:`, error);
      // If a specific doctorId was provided, update their session status in DB
      if (doctorId) {
        await Doctor.findByIdAndUpdate(doctorId, { whatsapp_session_id: null }); // Clear session ID if failed
        logger.warn(`Doctor ${doctorId} WhatsApp session reset due to error.`);
      }
      throw error;
    }
  },
  { connection }
);

sessionRefreshWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed for session ${job.data.sessionId || job.data.doctorId}`);
});

sessionRefreshWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed for session ${job.data.sessionId || job.data.doctorId}: ${err.message}`);
});

logger.info('Session Refresh Worker started.');

module.exports = sessionRefreshWorker;
