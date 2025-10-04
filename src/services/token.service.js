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
    blacklisted});
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  // TODO: Implement token verification logic. This should include checking if the token is blacklisted or expired.
  // If the token is valid, return the token document. Otherwise, throw an ApiError.
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });

  // Check if token is expired based on payload
  if (payload.exp < moment().unix()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token expired');
  }

  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found or blacklisted');
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
      expires: accessTokenExpires.toDate()},
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate()}};
};

// TODO: Add a function to regenerate auth tokens using a refresh token.
// This function should:
// 1. Verify the provided refresh token.
// 2. If valid, generate new access and refresh tokens.
// 3. Save the new refresh token.
// 4. Optionally, blacklist the old refresh token.
// 5. Return the new auth tokens.

/**
 * Regenerate auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const regenerateAuthTokens = async (refreshToken) => {
  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  const tokenDoc = await Token.findOne({ token: refreshToken, type: 'refresh', user: decoded.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
  }

  // Check if token is expired based on payload
  if (decoded.exp < moment().unix()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token expired');
  }

  const doctorId = decoded.sub;
  const accessTokenExpires = moment().add(process.env.JWT_ACCESS_EXPIRATION_MINUTES, 'minutes');
  const accessToken = generateToken(doctorId, accessTokenExpires, 'access');

  const newRefreshTokenExpires = moment().add(process.env.JWT_REFRESH_EXPIRATION_DAYS, 'days');
  const newRefreshToken = generateToken(doctorId, newRefreshTokenExpires, 'refresh');
  await saveToken(newRefreshToken, doctorId, newRefreshTokenExpires, 'refresh');

  // Optionally blacklist the old refresh token
  await Token.updateOne({ _id: tokenDoc._id }, { $set: { blacklisted: true } });

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate()},
    refresh: {
      token: newRefreshToken,
      expires: newRefreshTokenExpires.toDate()}};
};

// TODO: Add a function to blacklist a token.
// This function should:
// 1. Take a token string as input.
// 2. Find the token in the database and mark it as blacklisted.

/**
 * Blacklist a token
 * @param {string} token
 * @returns {Promise<void>}
 */
const blacklistToken = async (token) => {
  const tokenDoc = await Token.findOne({ token });
  if (tokenDoc) {
    tokenDoc.blacklisted = true;
    await tokenDoc.save();
  } else {
    // Optionally throw an error if the token is not found
    // throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
    logger.warn(`Attempted to blacklist a non-existent token: ${token}`);
  }
};


module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  regenerateAuthTokens, // Add the new function to exports
  blacklistToken, // Add the new function to exports
};