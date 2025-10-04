const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pino = require('pino');
const { handleIncomingMessage } = require('../services/whatsappService');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

// This controller handles webhooks from external services.
// WhatsApp messages from whatsapp-web.js are typically handled directly by the client.on('message') event
// in whatsappService.js, not via a separate webhook endpoint. This endpoint would be for
// WhatsApp Business API or a proxy forwarding messages.
const handleWhatsappWebhook = catchAsync(async (req, res) => {
  logger.info('Received WhatsApp webhook:', req.body);

  // TODO: Implement verification for WhatsApp Business API webhooks (e.g., verify token, check signature)
  const { body } = req;

  // Example of processing WhatsApp Business API message structure
  if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages) {
    const messages = body.entry[0].changes[0].value.messages;
    for (const message of messages) {
      // This assumes 'handleIncomingMessage' can process a simplified or raw webhook message
      // For now, it logs and does not process to avoid double-handling if whatsapp-web.js is used.
      // await handleIncomingMessage(message);
      logger.info('WhatsApp Business API message received, processing disabled in skeleton. See whatsappService.js client.on for whatsapp-web.js.');
    }
  }

  res.status(httpStatus.OK).send('WhatsApp webhook received');
});

const handlePaymentWebhook = catchAsync(async (req, res) => {
  logger.info('Received Payment webhook:', req.body);
  // TODO: Implement payment processing logic
  // Verify payment, update appointment status, notify patient/doctor etc.
  res.status(httpStatus.OK).send('Payment webhook received');
});

module.exports = {
  handleWhatsappWebhook,
  handlePaymentWebhook,
};
