const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true},
  specialization: {
    type: String,
    required: true,
    trim: true},
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!value.match(/^\S+@\S+\.\S+$/)) {
        throw new Error('Invalid email');
      }
    }},
  password: {
    type: String,
    required: true,
    private: true, // used by the toJSON plugin
  },
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
  availability_slots: [
    {
      dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
      startTime: { type: String, required: true }, // e.g., "09:00"
      endTime: { type: String, required: true },   // e.g., "17:00"
      interval: { type: Number, default: 30 }, // in minutes
    }],
  templates: [
    {
      name: { type: String, required: true },
      content: { type: String, required: true },
      language: { type: String, default: 'en' }}],
  role: {
    type: String,
    enum: ['doctor', 'admin'],
    default: 'doctor'},
  // For whatsapp-web.js session management, if doctor has their own instance
  whatsapp_session_id: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but enforces uniqueness for non-null values
  }},
{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

doctorSchema.set('toJSON', { getters: true, virtuals: true });
doctorSchema.set('toObject', { getters: true, virtuals: true });

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;