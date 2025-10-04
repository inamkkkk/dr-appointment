class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      // TODO: Ensure stack trace is captured correctly for Node.js environments.
      // This line is standard for Node.js, but if there are specific debugging needs,
      // it might need adjustment or additional context.
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;