const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createAppointment = {
  body: Joi.object().keys({
    doctor_id: Joi.string().custom(objectId).required(),
    patient_id: Joi.string().custom(objectId).required(),
    slot_time: Joi.date().required(),
    source: Joi.string().valid('whatsapp', 'web', 'admin').default('whatsapp'),
    notes: Joi.string(),
  }),
};

const updateAppointment = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      slot_time: Joi.date(),
      status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed', 'no-show'),
      notes: Joi.string(),
    })
    .min(1),
};

module.exports = {
  createAppointment,
  updateAppointment,
};
