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
  });

  whatsappClient.on('auth_failure', (msg) => {
    logger.error('WhatsApp Client Authentication failure', msg);
    // TODO: Handle authentication failure, e.g., restart client or notify admin
  });

  whatsappClient.on('disconnected', (reason) => {
    logger.warn('WhatsApp Client disconnected:', reason);
    // TODO: Implement re-connection logic or session refresh worker trigger
    whatsappClient = null; // Reset client on disconnect
  });

  whatsappClient.on('message', async (message) => {
    logger.info(`Message received from ${message.from}: ${message.body}`);
    // TODO: Pass message to Intent Router for processing
    // Example: await handleIncomingMessage(message);
  });

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
  getWhatsappClient,
};
