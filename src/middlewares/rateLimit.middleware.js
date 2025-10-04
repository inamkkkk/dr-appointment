const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per 15 minutes
  skipSuccessfulRequests: true,
  handler: (req, res, next) => {
    next(new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many authentication attempts, please try again after 15 minutes'));
  },
});

const llmRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 LLM messages per hour per doctor
  keyGenerator: (req, res) => {
    // For a per-doctor limit, you would use req.user.id
    // For a per-IP limit, req.ip is sufficient
    return req.user ? req.user.id : req.ip; // Assuming req.user is populated by auth middleware
  },
  handler: (req, res, next) => {
    next(new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many LLM requests, please try again later. (Max 20 messages/hour)'));
  },
});

module.exports = {
  authLimiter,
  llmRateLimiter,
};
