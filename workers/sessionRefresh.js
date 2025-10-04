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
  port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10)};

const sessionRefreshWorker = new Worker(
  'sessionRefreshQueue',
  async (job) => {
    const { sessionId, doctorId } = job.data;
    logger.info(`Processing session refresh job for session: ${sessionId || doctorId}`);

    try {
      // For whatsapp-web.js, session refresh usually means re-initializing if disconnected
      // or ensuring the client is still connected.

      let client = getWhatsappClient(sessionId); // Pass sessionId to get the correct client

      if (!client || !client.isReady) {
        logger.info(`WhatsApp client for session ${sessionId || doctorId} not ready or disconnected. Attempting re-initialization.`);
        await initWhatsappClient(sessionId); // initWhatsappClient should handle session ID management
        client = getWhatsappClient(sessionId); // Get the newly initialized client
      }

      if (client && client.isReady) {
        logger.info(`WhatsApp client for session ${sessionId || doctorId} is ready and healthy.`);
        // Optionally, perform a lightweight check, e.g., get contacts
        // const contacts = await client.getContacts();
        // logger.debug(`Client for session ${sessionId} has ${contacts.length} contacts.`);
      } else {
        logger.error(`Failed to refresh or reconnect WhatsApp client for session ${sessionId || doctorId}.`);
        // TODO: Notify admin, trigger a manual re-scan QR flow
        // A possible implementation could be sending an email to an admin
        // or emitting an event that a UI can listen to for QR code display.
        // For now, we'll just log a detailed error and allow the failed job to be handled.
        logger.error(`WhatsApp client for session ${sessionId || doctorId} remains unready after re-initialization attempt.`);
      }

      // TODO: Implement session rotation logic if using multiple WhatsApp instances/numbers
      // This might involve fetching a new session from a pool or creating a new one.
      // If session rotation is implemented, it would likely involve
      // fetching a new session ID and potentially calling initWhatsappClient with it,
      // then updating the doctor's record with the new session ID.
      // For this iteration, we'll assume a single session per doctor for simplicity.
      logger.info(`Session refresh for ${sessionId || doctorId} complete.`);
    } catch (error) {
      logger.error(`Error in session refresh worker for job ${job.id}:`, error);
      // If a specific doctorId was provided, update their session status in DB
      if (doctorId) {
        // Find the doctor and check if their session ID matches the one that failed to refresh
        const doctor = await Doctor.findById(doctorId);
        if (doctor && doctor.whatsapp_session_id === sessionId) {
          await Doctor.findByIdAndUpdate(doctorId, { whatsapp_session_id: null }); // Clear session ID if failed
          logger.warn(`Doctor ${doctorId} WhatsApp session reset due to error in worker for session ${sessionId}.`);
        } else {
          logger.warn(`Doctor ${doctorId} session ID mismatch. Not resetting session in DB for session ${sessionId}. Current session ID in DB: ${doctor?.whatsapp_session_id}`);
        }
      }
      throw error; // Re-throw the error to allow BullMQ to handle retries/failures
    }
  },
  { connection }
);

sessionRefreshWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed for session ${job.data.sessionId || job.data.doctorId}`);
});

sessionRefreshWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed for session ${job.data.sessionId || job.data.doctorId}: ${err.message}`);
  // TODO: Implement retry logic or fallback mechanisms for failed jobs
  // BullMQ has built-in retry options. If more complex logic is needed,
  // it could involve sending a notification to an administrator or
  // attempting to manually restart the WhatsApp client.
});

logger.info('Session Refresh Worker started.');

module.exports = sessionRefreshWorker;