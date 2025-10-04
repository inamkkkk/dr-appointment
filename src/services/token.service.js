const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const Token = require('../models/Token');
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

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {moment.Moment} expires
 * @param {string} type
 * @param {string} [secret] - The secret key to sign the token with. Defaults to JWT_SECRET.
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = process.env.JWT_SECRET) => {
  const payload = { sub: userId, iat: moment().unix(), exp: expires.unix(), type };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {moment.Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted=false]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {Doctor} doctor
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (doctor) => {
  const accessTokenExpires = moment().add(process.env.JWT_ACCESS_EXPIRATION_MINUTES, 'minutes');
  const accessToken = generateToken(doctor.id, accessTokenExpires, 'access');

  const refreshTokenExpires = moment().add(process.env.JWT_REFRESH_EXPIRATION_DAYS, 'days');
  const refreshToken = generateToken(doctor.id, refreshTokenExpires, 'refresh');
  await saveToken(refreshToken, doctor.id, refreshTokenExpires, 'refresh');

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
};
