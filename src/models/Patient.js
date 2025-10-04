const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true},
  phone: {
    type: String,
    required: true,
    trim: true,
    set: encrypt,
    get: decrypt},
  whatsapp_number: {
    type: String,
    required: true,
    trim: true,
    set: encrypt,
    get: decrypt},
  email: {
    type: String,
    trim: true,
    lowercase: true,
    set: encrypt,
    get: decrypt,
    validate(value) {
      if (value && !value.match(/^\S+@\S+\.\S+$/)) {
        throw new Error('Invalid email');
      }
    }},
  dob: {
    type: Date,
    set: encrypt,
    get: decrypt},
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    set: encrypt,
    get: decrypt},
  reminder_prefs: {
    viaWhatsapp: { type: Boolean, default: true },
    viaSMS: { type: Boolean, default: false },
    viaEmail: { type: Boolean, default: false },
    preferredTime: { type: String, default: '09:00' }, // e.g., 'HH:MM'
  }},
{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

patientSchema.set('toJSON', { getters: true, virtuals: true });
patientSchema.set('toObject', { getters: true, virtuals: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;