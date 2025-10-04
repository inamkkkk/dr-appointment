const { Worker } = require('bullmq');
const { summarizeText } = require('../src/services/llmService');
const Message = require('../src/models/Message');
const ConversationSummary = require('../src/models/ConversationSummary');
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

const summarizerWorker = new Worker(
  'summarizerQueue',
  async (job) => {
    const { conversationId, latestMessageTimestamp } = job.data;
    logger.info(`Processing summarization job for conversation: ${conversationId}`);

    try {
      // Fetch recent messages for the conversation
      const recentMessages = await Message.find({
        conversation_id: conversationId,
        // Only summarize messages after the last summary or a certain threshold
        timestamp: { $gt: latestMessageTimestamp || new Date(0) },
      })
        .sort({ timestamp: 1 })
        .limit(50); // Limit to a reasonable number of messages for summarization

      if (recentMessages.length === 0) {
        logger.info(`No new messages to summarize for conversation ${conversationId}.`);
        return;
      }

      const conversationText = recentMessages.map((msg) => `${msg.direction === 'incoming' ? 'Patient' : 'Doctor'}: ${msg.text}`).join('\n');

      const summary = await summarizeText(conversationText);
      const keyPoints = summary.split('. ').filter(Boolean).map(s => s.trim()); // Basic key point extraction

      // TODO: Generate embedding for the summary and store in Vector Memory Hub (e.g., Qdrant)
      // const embedding = await vectorMemoryHub.generateEmbedding(summary);
      const embeddingRef = `embedding_ref_${Date.now()}`; // Placeholder

      await ConversationSummary.findOneAndUpdate(
        { conversation_id: conversationId },
        {
          summary_text: summary,
          key_points: keyPoints,
          embedding_ref: embeddingRef,
          last_updated: new Date(),
          // TODO: link patient_id if identified
        },
        { upsert: true, new: true }
      );
      logger.info(`Summarization complete for conversation ${conversationId}.`);
    } catch (error) {
      logger.error(`Error in summarizer worker for job ${job.id}:`, error);
      throw error;
    }
  },
  { connection }
);

summarizerWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed for conversation ${job.data.conversationId}`);
});

summarizerWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed for conversation ${job.data.conversationId}: ${err.message}`);
});

logger.info('Summarizer Worker started.');

module.exports = summarizerWorker;
