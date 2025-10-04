const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    name: Joi.string().required().min(3).max(30).messages({
      'string.empty': 'Name cannot be empty.',
      'string.min': 'Name must be at least 3 characters long.',
      'string.max': 'Name must be at most 30 characters long.'}),
    email: Joi.string().required().email().messages({
      'string.empty': 'Email cannot be empty.',
      'string.email': 'Email must be a valid email address.'}),
    password: Joi.string().required().custom(password).messages({
      'string.empty': 'Password cannot be empty.',
      'any.custom': 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.'}),
    specialization: Joi.string().required().messages({
      'string.empty': 'Specialization cannot be empty.'}),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/).messages({
      'string.empty': 'Phone number cannot be empty.',
      'string.pattern.base': 'Phone number must be a 10-digit number.'}),
    whatsapp_number: Joi.string().required().pattern(/^[0-9]{10}$/).messages({
      'string.empty': 'WhatsApp number cannot be empty.',
      'string.pattern.base': 'WhatsApp number must be a 10-digit number.'})})};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required().email().messages({
      'string.empty': 'Email cannot be empty.',
      'string.email': 'Email must be a valid email address.'}),
    password: Joi.string().required().messages({
      'string.empty': 'Password cannot be empty.'})})};

module.exports = {
  register,
  login};