const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config'); // Assume config.js holds JWT_SECRET, expiry
const Token = require('../models/Token'); // Assume Token model for refreshing
const httpStatus = require('http-status');
const ApiError = require('./ApiError');

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
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, 'access');

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, 'refresh');
  await saveToken(refreshToken, user.id, refreshTokenExpires, 'refresh');

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate()},
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate()}};
};

// Token model (for refreshing tokens), assuming it exists
// If not, it would be a simple schema similar to:
// const tokenSchema = new mongoose.Schema({
//   token: { type: String, required: true, index: true },
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
//   type: { type: String, enum: ['refresh', 'resetPassword'], required: true },
//   expires: { type: Date, required: true },
//   blacklisted: { type: Boolean, default: false },
// }, { timestamps: true });
// const Token = mongoose.model('Token', tokenSchema);


module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens};