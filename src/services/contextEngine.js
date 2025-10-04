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
    logger.info(`Session for ${conversationId} not found in Redis. Trying to fetch from MongoDB.`);
    const snapshot = await ConversationSummary.findOne({ conversation_id: conversationId });

    if (snapshot) {
      // Restore session from MongoDB snapshot
      const sessionToRestore = {
        conversationId: snapshot.conversation_id,
        // Add other relevant fields from snapshot that constitute session state
        // For this example, we'll assume the snapshot contains basic session info.
        // In a real-world scenario, you'd carefully select which fields to restore.
        ...snapshot.toObject(), // Convert Mongoose document to plain object
        created_at: snapshot.created_at ? snapshot.created_at.getTime() : Date.now(), // Ensure created_at is a timestamp
        updated_at: snapshot.last_updated ? snapshot.last_updated.getTime() : Date.now(), // Use last_updated from snapshot
      };

      // Remove fields that are not part of the session state if necessary
      // e.g., delete sessionToRestore._id; delete sessionToRestore.__v;

      await redisClient.setex(
        sessionKey,
        SESSION_TTL_SECONDS,
        JSON.stringify(sessionToRestore)
      );
      logger.info(`Session for ${conversationId} restored from MongoDB snapshot and cached in Redis.`);
      return sessionToRestore;
    }

    logger.info(`Session for ${conversationId} not found in Redis or MongoDB.`);
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
      // If session doesn't exist, create a new one with basic info
      currentSession = { conversationId, created_at: Date.now() };
    }
    const updatedSession = { ...currentSession, ...data, updated_at: Date.now() };

    await redisClient.setex(
      sessionKey,
      SESSION_TTL_SECONDS,
      JSON.stringify(updatedSession)
    );
    // Trigger snapshotting to MongoDB asynchronously to avoid blocking response
    setImmediate(() => snapshotSessionToMongo(conversationId, updatedSession));
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
    logger.info(`Session for ${conversationId} deleted from Redis.`);
    // Optionally, delete from MongoDB snapshot as well if that's desired behavior
    // await ConversationSummary.deleteOne({ conversation_id: conversationId });
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
  try {
    // Ensure sessionData contains fields relevant to ConversationSummary
    // You might want to selectively pick fields from sessionData.
    const snapshotData = {
      conversation_id: conversationId,
      // Example: Storing a summary of the conversation, last message, user context, etc.
      // Assuming sessionData might contain 'summary', 'lastMessage', 'userProfile' etc.
      summary: sessionData.summary || '', // Use provided summary or default
      last_message_timestamp: sessionData.last_message_timestamp || Date.now(), // Example field
      user_context: sessionData.user_context || {}, // Example field
      created_at: sessionData.created_at ? new Date(sessionData.created_at) : new Date(), // Use created_at from session or current date
      last_updated: new Date(sessionData.updated_at || Date.now()), // Use updated_at from session or current date
    };

    await ConversationSummary.findOneAndUpdate(
      { conversation_id: conversationId },
      { $set: snapshotData }, // Use $set to update specific fields
      { upsert: true, new: true }
    );
    logger.info(`Session snapshot for ${conversationId} saved/updated in MongoDB.`);
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