const Joi = require('joi');

const getContext = {
  params: Joi.object().keys({
    conversationId: Joi.string().required(),
  }),
};

const updateContext = {
  params: Joi.object().keys({
    conversationId: Joi.string().required(),
  }),
  body: Joi.object()
    .pattern(Joi.string(), Joi.any()) // Allow any key-value pairs for flexible context updates
    .min(1),
};

module.exports = {
  getContext,
  updateContext,
};
