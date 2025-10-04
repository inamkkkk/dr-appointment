const redisClient = require('../config/redis');
const ConversationSummary = require('../models/ConversationSummary');
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

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Retrieves the session data for a given conversation ID from Redis.
 * If not found in Redis, tries to fetch from MongoDB snapshot (TODO) and restore.
 * @param {string} conversationId
 * @returns {Promise<object | null>}
 */
const getSession = async (conversationId) => {
  const sessionKey = `session:${conversationId}`;
  try {
    const sessionData = await redisClient.get(sessionKey);
    if (sessionData) {
      // Extend TTL on access (sliding window)
      await redisClient.expire(sessionKey, SESSION_TTL_SECONDS);
      return JSON.parse(sessionData);
    }

    // TODO: If not in Redis, try to fetch a recent snapshot from MongoDB
    // For skeleton, we'll just return null if not in Redis
    logger.info(`Session for ${conversationId} not found in Redis. No MongoDB snapshot implemented.`);
    return null;
  } catch (error) {
    logger.error(`Error getting session for ${conversationId}:`, error);
    return null;
  }
};

/**
 * Updates the session data for a given conversation ID in Redis.
 * @param {string} conversationId
 * @param {object} data - Partial session data to update
 * @returns {Promise<boolean>}
 */
const updateSession = async (conversationId, data) => {
  const sessionKey = `session:${conversationId}`;
  try {
    let currentSession = await getSession(conversationId);
    if (!currentSession) {
      currentSession = { conversationId, created_at: Date.now() };
    }
    const updatedSession = { ...currentSession, ...data, updated_at: Date.now() };

    await redisClient.setex(
      sessionKey,
      SESSION_TTL_SECONDS,
      JSON.stringify(updatedSession)
    );
    return true;
  } catch (error) {
    logger.error(`Error updating session for ${conversationId}:`, error);
    return false;
  }
};

/**
 * Deletes the session data for a given conversation ID from Redis.
 * @param {string} conversationId
 * @returns {Promise<boolean>}
 */
const deleteSession = async (conversationId) => {
  const sessionKey = `session:${conversationId}`;
  try {
    await redisClient.del(sessionKey);
    return true;
  } catch (error) {
    logger.error(`Error deleting session for ${conversationId}:`, error);
    return false;
  }
};

/**
 * Takes a snapshot of the current session state and stores it in MongoDB.
 * This is a placeholder for `ttl_policy: snapshot to Mongo`.
 * @param {string} conversationId
 * @param {object} sessionData
 */
const snapshotSessionToMongo = async (conversationId, sessionData) => {
  // TODO: Implement actual snapshot logic.
  // This would typically involve saving relevant parts of the session to ConversationSummary
  // or a dedicated SessionArchive collection.
  try {
    await ConversationSummary.findOneAndUpdate(
      { conversation_id: conversationId },
      { ...sessionData, last_updated: new Date() },
      { upsert: true, new: true }
    );
    logger.info(`Session snapshot for ${conversationId} saved to MongoDB.`);
  } catch (error) {
    logger.error(`Error taking session snapshot for ${conversationId}:`, error);
  }
};

module.exports = {
  getSession,
  updateSession,
  deleteSession,
  snapshotSessionToMongo, // Export for workers to use (e.g., session_refresh_worker)
};
