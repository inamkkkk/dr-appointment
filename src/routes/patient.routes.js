const express = require('express');
const patientController = require('../controllers/patient.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { patientValidation } = require('../validations');

const router = express.Router();

// TODO: Add more routes for patient management, e.g., getPatientById, updatePatient, deletePatient, getPatientsList
router.post('/', auth('managePatients'), validate(patientValidation.createPatient), patientController.createPatient);
router.get('/:id/history', auth('getPatientHistory'), validate(patientValidation.getPatientHistory), patientController.getPatientHistory);

module.exports = router;