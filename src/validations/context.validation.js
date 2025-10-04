const Joi = require('joi');

const getContext = {
  params: Joi.object().keys({
    conversationId: Joi.string().required().uuid(), // Added uuid validation for conversationId
  })};

const updateContext = {
  params: Joi.object().keys({
    conversationId: Joi.string().required().uuid(), // Added uuid validation for conversationId
  }),
  body: Joi.object()
    .pattern(Joi.string(), Joi.any()) // Allow any key-value pairs for flexible context updates
    .min(1)
    .unknown(true), // Explicitly allow unknown keys in the body to prevent unexpected data
};

module.exports = {
  getContext,
  updateContext};