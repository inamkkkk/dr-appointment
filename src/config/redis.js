const Redis = require('ioredis');
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

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // TODO: Add a configuration for password if REDIS_PASSWORD is provided
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

// TODO: Add a listener for the 'connect' event to log successful connection

module.exports = redisClient;