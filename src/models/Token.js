const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor', // Assuming Doctor is the primary user for auth
      required: true,
    },
    type: {
      type: String,
      enum: ['refresh', 'resetPassword', 'verifyEmail'],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
