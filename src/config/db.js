const mongoose = require('mongoose');
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

const connectDB = async () => {
  try {
    // TODO: Ensure process.env.MONGO_URI is defined and log a warning if it's missing.
    if (!process.env.MONGO_URI) {
      logger.warn('MONGO_URI is not defined. MongoDB connection might fail.');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;