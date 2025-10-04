const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pino = require('pino');
const { handleIncomingMessage } = require('../services/whatsappService');
const crypto = require('crypto');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

// Retrieve your WhatsApp Business API verification token from environment variables
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_CLIENT_SECRET = process.env.WHATSAPP_CLIENT_SECRET; // For signature verification

// This controller handles webhooks from external services.
// WhatsApp messages from whatsapp-web.js are typically handled directly by the client.on('message') event
// in whatsappService.js, not via a separate webhook endpoint. This endpoint would be for
// WhatsApp Business API or a proxy forwarding messages.
const handleWhatsappWebhook = catchAsync(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Received WhatsApp webhook request:', { query: req.query, body: req.body });

  // --- Verification Step ---
  // This part is for the initial webhook verification.
  // The 'mode' and 'token' should match what you configured in your WhatsApp Business API dashboard.
  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully.');
    return res.status(httpStatus.OK).send(challenge);
  } else if (mode) {
    // If mode is present but verification failed, send a 403 Forbidden.
    logger.warn('WhatsApp webhook verification failed. Invalid mode or token.');
    return res.status(httpStatus.FORBIDDEN).send('Verification failed.');
  }

  // --- Message Handling Step ---
  // This part handles incoming messages after verification.
  // We should check the signature to ensure the request is from Meta.
  const signature = req.headers['x-hub-signature'];
  if (!signature) {
    logger.warn('WhatsApp webhook received without X-Hub-Signature header.');
    // Depending on your security policy, you might return an error or proceed cautiously.
    // For now, we'll log and proceed, but a production system should likely return an error.
  } else {
    // Verify the signature. The signature is HMAC-SHA1 of the request body,
    // using your client secret as the key.
    const expectedSignature = `sha1=${crypto.createHmac('sha1', WHATSAPP_CLIENT_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
    if (signature !== expectedSignature) {
      logger.error('WhatsApp webhook signature verification failed.');
      return res.status(httpStatus.FORBIDDEN).send('Invalid signature.');
    }
    logger.info('WhatsApp webhook signature verified.');
  }


  const { body } = req;

  // Example of processing WhatsApp Business API message structure
  // This structure is specific to the WhatsApp Business API Cloud API.
  if (body.object === 'whatsapp_business_account' && body.entry) {
    for (const entry of body.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            const messages = change.value.messages;
            for (const message of messages) {
              // Here, we call the service to handle the incoming message.
              // It's crucial that 'handleIncomingMessage' is robust enough to process
              // the structure of messages coming from the WhatsApp Business API.
              // It's also important to ensure this doesn't conflict with messages
              // handled by whatsapp-web.js if both are somehow active.
              try {
                await handleIncomingMessage(message);
                logger.info({ message: 'Successfully processed WhatsApp Business API message', messageId: message.id });
              } catch (error) {
                logger.error({ error: error, message: 'Error processing WhatsApp Business API message' }, 'Error in handleIncomingMessage');
                // Depending on the error, you might want to send a specific response to WhatsApp
                // or retry processing. For now, we just log.
              }
            }
          }
        }
      }
    }
    // Respond with 200 OK to Meta to acknowledge receipt of the webhook.
    // This prevents Meta from retrying to send the same webhook.
    res.status(httpStatus.OK).send('Webhook received and processed');
  } else {
    // If the payload structure is unexpected, log it and return OK to prevent retries.
    logger.warn('Received WhatsApp webhook with unexpected structure.');
    res.status(httpStatus.OK).send('Unexpected webhook structure');
  }
});

const handlePaymentWebhook = catchAsync(async (req, res) => {
  logger.info('Received Payment webhook:', req.body);
  // TODO: Implement payment processing logic
  // Verify payment, update appointment status, notify patient/doctor etc.

  // Example: If using a payment gateway like Stripe, you would:
  // 1. Verify the webhook signature to ensure it's from Stripe.
  // 2. Parse the event data.
  // 3. Based on the event type (e.g., 'payment_intent.succeeded', 'charge.succeeded'),
  //    perform the necessary actions.
  // 4. For payment success: find the associated appointment/order, update its status to 'paid',
  //    and trigger notifications.
  // 5. Return a 200 OK response to acknowledge receipt.

  // Placeholder for actual implementation
  const paymentDetails = req.body;
  logger.info(`Processing payment webhook for: ${paymentDetails.id || 'unknown ID'}`);

  // Simulate processing and success
  if (paymentDetails && paymentDetails.status === 'succeeded') {
    // Implement logic to find and update related records
    logger.info('Payment succeeded. Initiating further processing.');
    // e.g., await updateAppointmentStatus(paymentDetails.metadata.appointmentId, 'paid');
    // e.g., await sendConfirmationEmail(paymentDetails.metadata.userId, paymentDetails.id);
  } else {
    logger.warn(`Payment webhook received with status: ${paymentDetails.status}`);
  }


  res.status(httpStatus.OK).send('Payment webhook received');
});

module.exports = {
  handleWhatsappWebhook,
  handlePaymentWebhook};