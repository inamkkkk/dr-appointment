const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const pino = require('pino');
const { handleIncomingMessage } = require('../services/whatsappService');

const router = express.Router();

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

// Route for incoming WhatsApp messages (from whatsapp-web.js internal events, or potentially a proxy)
// Note: This is an internal webhook, not a public one exposed by WhatsApp Business API.
// whatsapp-web.js handles messages internally, the handleIncomingMessage is called from its 'message' event.
// This endpoint is left as a placeholder if an external system would push messages.
router.post('/whatsapp', async (req, res) => {
  // For whatsapp-web.js, messages are handled in whatsappService.js's client.on('message')
  // This endpoint would be used if a proxy forwards messages from a whatsapp-web.js instance
  // or for the WhatsApp Business API webhook if implemented here.
  logger.info('Received a WhatsApp webhook event.');

  // TODO: Validate webhook request signature/token
  // For now, we'll just log and process if the body seems to contain messages.
  // In a production environment, implementing signature validation is crucial.

  if (req.body.entry && req.body.entry[0] && req.body.entry[0].changes && req.body.entry[0].changes[0] && req.body.entry[0].changes[0].value.messages) {
    const messages = req.body.entry[0].changes[0].value.messages;
    for (const message of messages) {
      // This branch is more aligned with WhatsApp Business API webhook structure.
      // For skeleton, we will pass a simplified message object.
      const simplifiedMessage = {
        from: message.from, // e.g., patient's WhatsApp ID
        to: process.env.WHATSAPP_BUSINESS_API_PHONE_ID, // Our bot's number
        body: message.text?.body || message.type, // Extract text or type
        timestamp: message.timestamp,
        // Add other relevant fields if needed
      };
      // await handleIncomingMessage(simplifiedMessage); // Uncomment to process
      logger.info('Processing incoming Business API message (disabled for now, handled by whatsapp-web.js client.on)');
    }
  } else {
    // This might be a direct message from a custom integration for whatsapp-web.js
    // Or for an external payment webhook
    logger.info('Generic webhook received:', req.body);
    if (req.body.message && req.body.message.from) {
      // Assuming a format similar to whatsapp-web.js 'message' event
      // await handleIncomingMessage(req.body.message); // Uncomment to process
      logger.info('Processing incoming whatsapp-web.js style message (disabled for now, handled by client.on)');
    }
  }
  res.status(200).send('Event received');
});

router.post('/payment', webhookController.handlePaymentWebhook);

module.exports = router;