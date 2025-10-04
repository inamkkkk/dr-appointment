const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { doctorValidation } = require('../validations');

const router = express.Router();

router
  .route('/')
  .get(auth('getDoctors'), doctorController.getDoctors);

router
  .route('/:id')
  .get(auth('getDoctor'), validate(doctorValidation.getDoctor), doctorController.getDoctor)
  .put(auth('manageDoctors'), validate(doctorValidation.updateDoctor), doctorController.updateDoctor);

module.exports = router;