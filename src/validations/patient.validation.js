const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createPatient = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    whatsapp_number: Joi.string().required(),
    email: Joi.string().email(),
    dob: Joi.date(),
    gender: Joi.string().valid('male', 'female', 'other'),
    reminder_prefs: Joi.object({
      viaWhatsapp: Joi.boolean(),
      viaSMS: Joi.boolean(),
      viaEmail: Joi.boolean(),
      preferredTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
    }),
  }),
};

const getPatientHistory = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createPatient,
  getPatientHistory,
};
