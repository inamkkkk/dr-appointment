const { createWhatsappClient, getWhatsappClient } = require('../config/whatsapp');
const pino = require('pino');
const { getIntentAndEntities } = require('./intentRouter');
const { getSession, updateSession } = require('./contextEngine');
const { generateReply } = require('./llmService');
const Message = require('../models/Message');
const axios = require('axios'); // Added for Business API integration

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

    // **Refinement**: Added basic example for Business API integration.
    // This part needs to be configured with your actual API endpoint and credentials.
    const WHATSAPP_API_URL = process.env.WHATSAPP_BUSINESS_API_URL; // e.g., 'https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages'
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_BUSINESS_API_TOKEN; // Your access token

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      logger.error('WhatsApp Business API URL or Token not configured.');
      return { success: false, message: 'WhatsApp Business API not configured.' };
    }

    try {
      let payload;
      if (templateName) {
        // Sending a template message
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' }, // Assuming English, adjust if needed
            components: [{
              type: 'body',
              parameters: Object.entries(variables).map(([key, value]) => ({ type: 'text', text: String(value) }))
            }]
          }
        };
      } else {
        // Sending a text message
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        };
      }

      const response = await axios.post(WHATSAPP_API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'}});

      logger.info(`WhatsApp Business API response: ${JSON.stringify(response.data)}`);
      // Assuming the API returns a success status and a message ID
      const messageId = response.data?.messages?.[0]?.id;
      return { success: true, messageId: messageId || 'N/A', method: 'business_api' };

    } catch (error) {
      logger.error(`Error sending message via WhatsApp Business API to ${to}:`, error.response ? error.response.data : error.message);
      return { success: false, message: error.message, errorDetails: error.response?.data };
    }
  }};

/**
 * Initializes the WhatsApp client for whatsapp-web.js.
 */
const initWhatsappClient = async (sessionId = 'default') => {
  const client = createWhatsappClient(sessionId);
  try {
    await client.initialize();
    logger.info('WhatsApp Client initialized successfully.');

    client.on('ready', () => {
      logger.info('WhatsApp Client is ready!');
    });

    client.on('auth_failure', msg => {
      logger.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('disconnected', (reason) => {
      logger.warn('Client was logged out', reason);
      // TODO: Implement re-authentication or cleanup logic
    });

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
      const sentMessage = await client.sendMessage(chatId, message);
      logger.info(`Message sent to ${chatId} via whatsapp-web.js: ${message}`);
      await Message.create({
        conversation_id: chatId,
        from: client.info.wid.user,
        to: chatId,
        text: message,
        timestamp: new Date(),
        direction: 'outgoing',
        message_id: sentMessage.id, // Store message ID from web.js
      });
      return { success: true, method: 'web.js', messageId: sentMessage.id };
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
    const incomingMessage = await Message.create({
      conversation_id: conversationId,
      from: message.from,
      to: message.to,
      text: message.body,
      timestamp: new Date(message.timestamp * 1000),
      direction: 'incoming',
      message_id: message.id, // Store message ID from webhook
      // attachments: message.hasMedia ? [{ type: message.type, url: 'TODO: get media url' }] : []});

    // TODO: Handle media messages properly. Extracting URLs and saving them.
    if (message.hasMedia) {
      logger.info(`Received media message of type: ${message.type}`);
      // Example: Get media and save it. This requires more specific logic based on media type.
      // const media = await message.downloadMedia();
      // if (media) {
      //   incomingMessage.attachments = [{ type: message.type, url: media.source, filename: media.filename }];
      //   await incomingMessage.save();
      // }
    }


    // 2. Intent Routing
    const { intent, entities, confidence } = await getIntentAndEntities(message.body);
    logger.info(`Detected intent: ${intent} with confidence ${confidence}`);

    // 3. Context Engine: Retrieve and update session
    const session = await getSession(conversationId);
    const updatedSessionData = {
      lastIntent: intent,
      last5Messages: (session?.last5Messages || []).concat({ role: 'user', content: message.body }).slice(-5),
      // TODO: Potentially enrich session with entities detected
    };
    await updateSession(conversationId, updatedSessionData);

    // 4. Query Orchestrator / LLM Layer
    let reply = 'I am sorry, I did not understand that. Can you please rephrase?';
    let usedLLM = false;

    switch (intent) {
      case 'greeting':
        reply = `Hello! How can I assist you today?`;
        break;
      case 'booking':
        // TODO: Orchestrate with QueryOrchestrator, LLM for slot suggestions
        // For now, a static reply as per TODO.
        reply = 'I can help you book an appointment. What day and time are you looking for?';
        break;
      case 'cancel_booking':
        // TODO: Orchestrate with QueryOrchestrator
        // For now, a static reply as per TODO.
        reply = 'To cancel an appointment, I\'ll need your appointment ID. Can you provide it?';
        break;
      case 'check_availability':
        // TODO: Orchestrate with QueryOrchestrator
        // For now, a static reply as per TODO.
        reply = 'Sure, for which doctor and date would you like to check availability?';
        break;
      case 'medical_advice':
        reply = await generateReply(message.body, { ...session, ...updatedSessionData }, true); // Force medical advice policy
        usedLLM = true;
        break;
      case 'get_patient_history':
        // TODO: Fetch patient ID and call QueryOrchestrator
        reply = 'I can fetch your patient history. Please confirm your identity first.';
        break;
      default:
        // Fallback to LLM for general queries or ambiguous intents
        reply = await generateReply(message.body, { ...session, ...updatedSessionData });
        usedLLM = true;
        break;
    }

    // 5. Send reply
    const sendResult = await sendMessage(conversationId, reply);
    if (!sendResult.success) {
      logger.error(`Failed to send reply to ${conversationId}: ${sendResult.message}`);
      // Optionally, try sending a fallback message if the primary send failed
      await sendMessage(conversationId, 'I am experiencing an issue right now. Please try again later.');
    }

    // Update message with processed intent and LLM usage
    await Message.findOneAndUpdate(
      { _id: incomingMessage._id }, // Use the _id of the saved incoming message
      { processed_intent: intent, used_llm: usedLLM, processed_reply: reply, reply_sent: sendResult.success }
    );

    // TODO: Trigger Summarizer Worker if conversation has grown
    // This would involve checking the length/depth of the conversation and potentially calling another service.
    // Example:
    // if (session?.messageCount > 10) { // Arbitrary threshold
    //   // triggerSummarizerWorker(conversationId);
    // }

  } catch (error) {
    logger.error(`Error handling incoming WhatsApp message from ${conversationId}:`, error);
    try {
      await sendMessage(conversationId, 'I am experiencing an issue right now. Please try again later.');
    } catch (sendError) {
      logger.error(`Failed to send error fallback message to ${conversationId}:`, sendError);
    }
  }
};

module.exports = {
  initWhatsappClient,
  sendMessage,
  handleIncomingMessage,
  whatsappBusinessApi, // Export for direct use if needed
};