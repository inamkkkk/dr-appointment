const { Client, LocalAuth } = require('whatsapp-web.js');
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

// WhatsApp Web.js client instance
let whatsappClient = null;

const createWhatsappClient = (sessionId = 'default') => {
  if (whatsappClient) {
    logger.warn('WhatsApp client already initialized. Returning existing client.');
    return whatsappClient;
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId, // Use a unique ID for the session
      dataPath: process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-infobars',
        '--window-size=1920,1080'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    if (process.env.WHATSAPP_WEB_JS_QR_CODE_ENABLED === 'true') {
      logger.info('QR RECEIVED', qr);
      // TODO: In a real app, send this QR to a frontend for scanning
      // Example: io.emit('qr', qr);
    }
  });

  whatsappClient.on('ready', () => {
    logger.info('WhatsApp Client is ready!');
  });

  whatsappClient.on('authenticated', (session) => {
    logger.info('WhatsApp Client Authenticated');
    // TODO: Save session data if needed for persistence or advanced handling
    // Example: fs.writeFileSync(`./session-${sessionId}.json`, JSON.stringify(session));
  });

  whatsappClient.on('auth_failure', (msg) => {
    logger.error('WhatsApp Client Authentication failure', msg);
    // TODO: Handle authentication failure, e.g., restart client or notify admin
    // Consider re-initializing the client or clearing the session data.
    // Example:
    // whatsappClient = null; // Reset client
    // createWhatsappClient(sessionId); // Attempt to re-create
  });

  whatsappClient.on('disconnected', (reason) => {
    logger.warn('WhatsApp Client disconnected:', reason);
    // TODO: Implement re-connection logic or session refresh worker trigger
    // Example:
    // if (reason === 'NAVIGATION_FAILURE' || reason === 'PAGE_LOAD_TIMEOUT') {
    //   logger.info('Attempting to reconnect...');
    //   setTimeout(() => {
    //     whatsappClient = null; // Ensure client is reset before re-creation
    //     createWhatsappClient(sessionId);
    //   }, 5000); // Wait 5 seconds before attempting reconnect
    // } else {
    //   whatsappClient = null; // Reset client on disconnect
    // }
    whatsappClient = null; // Reset client on disconnect
  });

  whatsappClient.on('message', async (message) => {
    logger.info(`Message received from ${message.from}: ${message.body}`);
    // TODO: Pass message to Intent Router for processing
    // Example: await handleIncomingMessage(message);
    // This would typically involve importing and calling a function from another module
    // const intentRouter = require('../router/intentRouter');
    // await intentRouter.handleIncomingMessage(message);
  });

  // Optionally, you can add more event listeners for other events like 'change_state', 'message_create', etc.
  // whatsappClient.on('change_state', (state) => {
  //   logger.info(`Client state changed: ${state}`);
  // });

  // whatsappClient.on('message_create', (message) => {
  //   // Fired whenever a message is created, both sent and received
  //   if (message.fromMe) {
  //     logger.info(`Outgoing message created: ${message.body}`);
  //   } else {
  //     logger.info(`Incoming message created: ${message.body}`);
  //   }
  // });

  logger.info('WhatsApp client creation initiated.');
  return whatsappClient;
};

const getWhatsappClient = () => {
  if (!whatsappClient) {
    logger.warn('WhatsApp client not initialized. Call createWhatsappClient first.');
    return null;
  }
  return whatsappClient;
};

module.exports = {
  createWhatsappClient,
  getWhatsappClient};