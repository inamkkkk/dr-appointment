const { createWhatsappClient, getWhatsappClient } = require('../config/whatsapp');
const pino = require('pino');
const { getIntentAndEntities } = require('./intentRouter');
const { getSession, updateSession } = require('./contextEngine');
const { generateReply } = require('./llmService');
const Message = require('../models/Message');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

// Placeholder for Business API client
const whatsappBusinessApi = {
  sendMessage: async (to, message, templateName = null, variables = {}) => {
    // TODO: Implement actual WhatsApp Business API integration
    logger.info(`Sending message via Business API to ${to}: ${message} (Template: ${templateName}, Vars: ${JSON.stringify(variables)})`);
    // Example: Axios.post(process.env.WHATSAPP_BUSINESS_API_URL, { ... })
    return { success: true, messageId: 'business_api_msg_id' };
  },
};

/**
 * Initializes the WhatsApp client for whatsapp-web.js.
 */
const initWhatsappClient = async (sessionId = 'default') => {
  const client = createWhatsappClient(sessionId);
  try {
    await client.initialize();
    logger.info('WhatsApp Client initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize WhatsApp Client:', error);
    throw error;
  }
};

/**
 * Sends a message using whatsapp-web.js or falls back to Business API.
 * @param {string} chatId - The recipient's chat ID (e.g., '1234567890@c.us').
 * @param {string} message - The message text.
 * @param {object} [options={}] - Options like templateName for Business API fallback.
 */
const sendMessage = async (chatId, message, options = {}) => {
  const client = getWhatsappClient();
  const { templateName, variables } = options;

  if (client && client.info) {
    try {
      // Simulate human-like delays and typing indicators
      await client.sendSeen(chatId);
      await client.sendPresence('typing', chatId);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500)); // 0.5 to 2.5 seconds delay
      await client.sendMessage(chatId, message);
      logger.info(`Message sent to ${chatId} via whatsapp-web.js: ${message}`);
      await Message.create({
        conversation_id: chatId,
        from: client.info.wid.user,
        to: chatId,
        text: message,
        timestamp: new Date(),
        direction: 'outgoing',
      });
      return { success: true, method: 'web.js' };
    } catch (error) {
      logger.error(`Error sending message via whatsapp-web.js to ${chatId}:`, error);
      logger.warn('Falling back to WhatsApp Business API.');
      // Fallback to Business API
      return whatsappBusinessApi.sendMessage(chatId, message, templateName, variables);
    }
  } else {
    logger.warn('whatsapp-web.js client not ready. Sending via WhatsApp Business API.');
    return whatsappBusinessApi.sendMessage(chatId, message, templateName, variables);
  }
};

/**
 * Handles incoming WhatsApp messages, processing them through the pipeline.
 * @param {object} message - The message object from whatsapp-web.js webhook.
 */
const handleIncomingMessage = async (message) => {
  if (message.isGroupMsg) {
    logger.info('Ignoring group message for now.');
    return;
  }

  const conversationId = message.from;
  logger.info(`Processing incoming message from ${conversationId}: ${message.body}`);

  try {
    // 1. Store raw message
    await Message.create({
      conversation_id: conversationId,
      from: message.from,
      to: message.to,
      text: message.body,
      timestamp: new Date(message.timestamp * 1000),
      direction: 'incoming',
      // attachments: message.hasMedia ? [{ type: message.type, url: 'TODO: get media url' }] : [],
    });

    // 2. Intent Routing
    const { intent, entities, confidence } = await getIntentAndEntities(message.body);
    logger.info(`Detected intent: ${intent} with confidence ${confidence}`);

    // 3. Context Engine: Retrieve and update session
    const session = await getSession(conversationId);
    await updateSession(conversationId, { lastIntent: intent, last5Messages: (session?.last5Messages || []).concat(message.body).slice(-5) });

    // 4. Query Orchestrator / LLM Layer
    let reply = 'I am sorry, I did not understand that. Can you please rephrase?';
    let usedLLM = false;

    switch (intent) {
      case 'greeting':
        reply = `Hello! How can I assist you today?`;
        break;
      case 'booking':
        // TODO: Orchestrate with QueryOrchestrator, LLM for slot suggestions
        reply = 'I can help you book an appointment. What day and time are you looking for?';
        break;
      case 'cancel_booking':
        // TODO: Orchestrate with QueryOrchestrator
        reply = 'To cancel an appointment, I\'ll need your appointment ID. Can you provide it?';
        break;
      case 'check_availability':
        // TODO: Orchestrate with QueryOrchestrator
        reply = 'Sure, for which doctor and date would you like to check availability?';
        break;
      case 'medical_advice':
        reply = generateReply(message.body, session, true); // Force medical advice policy
        usedLLM = true;
        break;
      case 'get_patient_history':
        // TODO: Fetch patient ID and call QueryOrchestrator
        reply = 'I can fetch your patient history. Please confirm your identity first.';
        break;
      default:
        // Fallback to LLM for general queries or ambiguous intents
        reply = await generateReply(message.body, session);
        usedLLM = true;
        break;
    }

    // 5. Send reply
    await sendMessage(conversationId, reply);

    // Update message with processed intent and LLM usage
    await Message.findOneAndUpdate(
      { conversation_id: conversationId, timestamp: new Date(message.timestamp * 1000), text: message.body },
      { processed_intent: intent, used_llm: usedLLM }
    );

    // TODO: Trigger Summarizer Worker if conversation has grown

  } catch (error) {
    logger.error('Error handling incoming WhatsApp message:', error);
    await sendMessage(conversationId, 'I am experiencing an issue right now. Please try again later.');
  }
};

module.exports = {
  initWhatsappClient,
  sendMessage,
  handleIncomingMessage,
  whatsappBusinessApi, // Export for direct use if needed
};
