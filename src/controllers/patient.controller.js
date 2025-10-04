const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { patientService, queryOrchestrator } = require('../services');
const ApiError = require('../utils/ApiError');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

const createPatient = catchAsync(async (req, res) => {
  logger.info('Creating new patient.');
  // TODO: Implement input validation for patient creation
  const patient = await patientService.createPatient(req.body);
  res.status(httpStatus.CREATED).send(patient);
});

const getPatient = catchAsync(async (req, res) => {
  logger.info('Fetching patient by ID:', req.params.id);
  // TODO: Add validation for req.params.id format
  const patient = await patientService.getPatientById(req.params.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  res.send(patient);
});

const getPatientHistory = catchAsync(async (req, res) => {
  logger.info('Fetching patient history for ID:', req.params.id);
  // TODO: Add validation for req.params.id format
  const history = await queryOrchestrator.getPatientHistory(req.params.id);
  if (!history) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient history not found or patient does not exist');
  }
  res.send(history);
});

module.exports = {
  createPatient,
  getPatient,
  getPatientHistory};