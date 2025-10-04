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
    // TODO: Add specific error message based on what contextEngine.getSession might return
    throw new ApiError(httpStatus.NOT_FOUND, 'Context not found for this conversation');
  }
  res.send(session);
});

const updateContext = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  logger.info(`Updating context for conversation ID: ${conversationId}`);
  // TODO: Add input validation for req.body to ensure it contains valid context data
  const updated = await contextEngine.updateSession(conversationId, req.body);
  if (!updated) {
    // TODO: Refine this error message. Is it always an internal server error if updateSession fails?
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update context');
  }
  // TODO: Consider if getSession is necessary here or if updateSession already returns the updated object
  const newSession = await contextEngine.getSession(conversationId);
  res.status(httpStatus.OK).send(newSession);
});

module.exports = {
  getContext,
  updateContext};