const passport = require('passport'); // Placeholder, actual JWT strategy would be here
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const jwt = require('jsonwebtoken');
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

/**
 * Middleware to authenticate JWT token and authorize roles.
 * @param {string[]} requiredRights - Array of rights/roles required for the route (e.g., ['getDoctors', 'manageAppointments'])
 */
const auth = (requiredRights = []) => (req, res, next) => {
  return new Promise((resolve, reject) => {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing or malformed'));
    }
    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // Attach user payload to request

      if (requiredRights.length) {
        // Basic role check example. In a real app, 'rights' would be granular permissions.
        // For this skeleton, we'll check `user.role` against hardcoded roles.
        let hasRequiredRight = false;
        if (requiredRights.includes('getDoctors') || requiredRights.includes('getDoctor') || requiredRights.includes('getAppointments') || requiredRights.includes('getContext') || requiredRights.includes('getPatientHistory')) {
          // All authenticated users can read their own or public data
          hasRequiredRight = true; // Simplified: any authenticated can view many things
        }
        if (requiredRights.includes('manageDoctors') || requiredRights.includes('manageAppointments') || requiredRights.includes('managePatients') || requiredRights.includes('updateContext')) {
          // Only 'admin' or the doctor themselves can manage certain things
          if (req.user.role === 'admin' || (req.user.role === 'doctor' && req.user.id === req.params.id)) {
            hasRequiredRight = true;
          }
        }

        if (!hasRequiredRight && !requiredRights.includes(req.user.role)) { // Fallback to direct role match
          return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
        }

        resolve();
      } else {
        resolve(); // No specific rights required, just authenticated
      }
    } catch (error) {
      logger.error('JWT authentication error:', error.message);
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
    }
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;
