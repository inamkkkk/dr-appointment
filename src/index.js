require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pino = require('pino');
const pinoPretty = require('pino-pretty');
const connectDB = require('./config/db');
const redisClient = require('./config/redis');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/errorHandler.middleware');
const routes = require('./routes');
const { initWhatsappClient } = require('./services/whatsappService');
const { summarizerQueue, reminderQueue, sessionRefreshQueue } = require('./queues');

// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());
app.options('*', cors());

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Connect to Redis
redisClient.on('connect', () => logger.info('Connected to Redis'));
redisClient.on('error', (err) => logger.error('Redis connection error:', err));

// Initialize WhatsApp client (for whatsapp-web.js)
initWhatsappClient().then(() => logger.info('WhatsApp client initialized.')).catch(error => logger.error('WhatsApp client initialization failed:', error));

// API routes
app.use('/api', routes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      // Close other resources like queues and Redis client here if necessary
      // For example:
      // summarizerQueue.close();
      // reminderQueue.close();
      // sessionRefreshQueue.close();
      redisClient.quit(() => {
        logger.info('Redis client disconnected');
        process.exit(1);
      });
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error('Unhandled error:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  exitHandler();
});