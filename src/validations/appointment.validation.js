const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createAppointment = {
  body: Joi.object().keys({
    doctor_id: Joi.string().custom(objectId).required().messages({
      'string.empty': 'Doctor ID cannot be an empty field',
      'string.pattern.base': 'Doctor ID must be a valid ObjectId',
      'any.required': 'Doctor ID is a required field'}),
    patient_id: Joi.string().custom(objectId).required().messages({
      'string.empty': 'Patient ID cannot be an empty field',
      'string.pattern.base': 'Patient ID must be a valid ObjectId',
      'any.required': 'Patient ID is a required field'}),
    slot_time: Joi.date().required().messages({
      'date.base': 'Slot time must be a valid date and time',
      'any.required': 'Slot time is a required field'}),
    source: Joi.string().valid('whatsapp', 'web', 'admin').default('whatsapp').messages({
      'any.only': 'Source must be one of: whatsapp, web, admin'}),
    notes: Joi.string().messages({
      'string.base': 'Notes must be a string'})})};

const updateAppointment = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required().messages({
      'string.empty': 'Appointment ID cannot be an empty field',
      'string.pattern.base': 'Appointment ID must be a valid ObjectId',
      'any.required': 'Appointment ID is a required field'})}),
  body: Joi.object()
    .keys({
      slot_time: Joi.date().messages({
        'date.base': 'Slot time must be a valid date and time'}),
      status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'no-show').messages({
        'any.only': 'Status must be one of: pending, confirmed, cancelled, completed, no-show'}),
      notes: Joi.string().messages({
        'string.base': 'Notes must be a string'})})
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update'})};

module.exports = {
  createAppointment,
  updateAppointment};