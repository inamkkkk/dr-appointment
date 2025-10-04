const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const validSchema = Object.keys(schema).reduce((obj, key) => {
    if (['params', 'query', 'body'].includes(key)) {
      obj[key] = schema[key];
    }
    return obj;
  }, {});
  const obj = Object.keys(validSchema).reduce((obj, key) => {
    obj[key] = req[key];
    return obj;
  }, {});

  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' } })
    .validate(obj);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
