const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true},
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor', // Assuming Doctor is the primary user for auth
      required: true},
    type: {
      type: String,
      enum: ['refresh', 'resetPassword', 'verifyEmail'],
      required: true},
    expires: {
      type: Date,
      required: true},
    blacklisted: {
      type: Boolean,
      default: false}},
  { timestamps: true }
);

// TODO: Add Mongoose validation for token schema if needed. For example,
// you might want to add checks for the format of the token string or
// ensure that 'expires' is a future date.

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;