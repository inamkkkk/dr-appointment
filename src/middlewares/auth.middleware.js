const passport = require('passport'); // Placeholder, actual JWT strategy would be here
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const jwt = require('jsonwebtoken');
const pino = require('loggers'); // Corrected import path for logger

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

/**
 * Middleware to authenticate JWT token and authorize roles.
 * @param {string[]} requiredRights - Array of rights/roles required for the route (e.g., ['getDoctors', 'manageAppointments'])
 */
const auth = (requiredRights = []) => (req, res, next) => {
  return new Promise((resolve, reject) => {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // TODO: Consider adding more specific error messages or logging for malformed headers.
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing or malformed'));
    }
    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // Attach user payload to request

      // TODO: Implement a more robust and flexible role/permission system.
      // The current implementation is a simplified example.
      // Consider using a library like 'casl' for comprehensive access control.
      if (requiredRights.length) {
        let userHasPermission = false;

        // Check if any of the required rights match the user's roles or explicitly granted permissions
        for (const right of requiredRights) {
          if (req.user.permissions && req.user.permissions.includes(right)) {
            userHasPermission = true;
            break;
          }
          // Simplified role check: if the required right is a role, check if user has it.
          // This might need to be more granular in a real application.
          if (right === req.user.role) {
            userHasPermission = true;
            break;
          }
        }

        // Special case: if the user is an admin, they should have access to most things
        if (req.user.role === 'admin') {
          userHasPermission = true;
        }

        // Specific check for managing doctors/appointments/patients if required
        if (requiredRights.some(r => ['manageDoctors', 'manageAppointments', 'managePatients'].includes(r))) {
          if (req.user.role === 'admin') {
            userHasPermission = true;
          }
          // Allow doctor to manage their own appointments if the specific ID matches.
          // This logic is very specific and might need generalization.
          else if (req.user.role === 'doctor' && req.params && req.params.id && req.user.id === req.params.id) {
            userHasPermission = true;
          }
        }


        if (!userHasPermission) {
          logger.warn(`User ${req.user.id} (${req.user.role}) attempted to access route requiring rights: ${requiredRights.join(', ')}`);
          return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Insufficient permissions'));
        }

        resolve();
      } else {
        resolve(); // No specific rights required, just authenticated
      }
    } catch (error) {
      logger.error('JWT authentication error:', error.message);
      // TODO: Differentiate between expired token and other JWT verification errors.
      if (error.name === 'TokenExpiredError') {
        return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
      }
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    }
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;