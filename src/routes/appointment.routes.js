const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('./../middlewares/validate.middleware');
const { appointmentValidation } = require('../validations');

const router = express.Router();

router
  .route('/')
  .get(auth('getAppointments'), appointmentController.getAppointments)
  .post(auth('manageAppointments'), validate(appointmentValidation.createAppointment), appointmentController.createAppointment);

router
  .route('/:id')
  .get(auth('getAppointments'), appointmentController.getAppointmentById) // Added GET by ID
  .patch(auth('manageAppointments'), validate(appointmentValidation.updateAppointment), appointmentController.updateAppointment)
  .delete(auth('manageAppointments'), appointmentController.deleteAppointment); // Added DELETE

module.exports = router;