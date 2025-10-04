const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { contextEngine } = require('../services');
const ApiError = require('../utils/ApiError');
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

const getContext = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  logger.info(`Fetching context for conversation ID: ${conversationId}`);
  const session = await contextEngine.getSession(conversationId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Context not found for this conversation');
  }
  res.send(session);
});

const updateContext = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  logger.info(`Updating context for conversation ID: ${conversationId}`);
  const updated = await contextEngine.updateSession(conversationId, req.body);
  if (!updated) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update context');
  }
  const newSession = await contextEngine.getSession(conversationId);
  res.status(httpStatus.OK).send(newSession);
});

module.exports = {
  getContext,
  updateContext,
};
