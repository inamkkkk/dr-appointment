const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getDoctor = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)})};

const updateDoctor = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)}),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
      specialization: Joi.string(),
      phone: Joi.string(),
      whatsapp_number: Joi.string(),
      availability_slots: Joi.array().items(
        Joi.object({
          dayOfWeek: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
          startTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:mm format
          endTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          interval: Joi.number().integer().min(10).max(120), // 10 to 120 minutes
        })
      ),
      templates: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          content: Joi.string().required(),
          language: Joi.string()})
      )})
    .min(1)};

// TODO: Add validation for creating a doctor
const createDoctor = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(), // Assuming password is required for creation
    specialization: Joi.string().required(),
    phone: Joi.string(),
    whatsapp_number: Joi.string(),
    // Add other fields if necessary for doctor creation
  })};


module.exports = {
  getDoctor,
  updateDoctor,
  createDoctor, // Export the new validation
};