const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createPatient = {
  body: Joi.object().keys({
    name: Joi.string().required().messages({
      'string.empty': 'Name is a required field.',
      'any.required': 'Name is a required field.'}),
    phone: Joi.string().required().messages({
      'string.empty': 'Phone number is a required field.',
      'any.required': 'Phone number is a required field.'}),
    whatsapp_number: Joi.string().required().messages({
      'string.empty': 'WhatsApp number is a required field.',
      'any.required': 'WhatsApp number is a required field.'}),
    email: Joi.string().email().messages({
      'string.email': 'Please enter a valid email address.'}),
    dob: Joi.date().messages({
      'date.base': 'Date of Birth must be a valid date.'}),
    gender: Joi.string().valid('male', 'female', 'other').messages({
      'any.only': 'Gender must be one of: male, female, or other.'}),
    reminder_prefs: Joi.object({
      viaWhatsapp: Joi.boolean().messages({
        'boolean.base': 'viaWhatsapp preference must be a boolean.'}),
      viaSMS: Joi.boolean().messages({
        'boolean.base': 'viaSMS preference must be a boolean.'}),
      viaEmail: Joi.boolean().messages({
        'boolean.base': 'viaEmail preference must be a boolean.'}),
      preferredTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
        'string.pattern.base': 'Preferred time must be in HH:mm format (e.g., 14:30).'})})})};

const getPatientHistory = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).messages({
      'any.custom': 'Patient ID must be a valid ObjectId.',
      'string.empty': 'Patient ID is a required field.',
      'any.required': 'Patient ID is a required field.'})})};

module.exports = {
  createPatient,
  getPatientHistory};