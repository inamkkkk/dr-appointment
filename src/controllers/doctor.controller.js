const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { doctorService } = require('../services');
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

const createDoctor = catchAsync(async (req, res) => {
  logger.info('Creating new doctor:', req.body.email);
  const doctor = await doctorService.createDoctor(req.body);
  res.status(httpStatus.CREATED).send(doctor);
});

const getDoctors = catchAsync(async (req, res) => {
  logger.info('Fetching all doctors.');
  const doctors = await doctorService.queryDoctors();
  res.send(doctors);
});

const getDoctor = catchAsync(async (req, res) => {
  logger.info('Fetching doctor by ID:', req.params.id);
  const doctor = await doctorService.getDoctorById(req.params.id);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found');
  }
  res.send(doctor);
});

const updateDoctor = catchAsync(async (req, res) => {
  logger.info('Updating doctor by ID:', req.params.id);
  const doctor = await doctorService.updateDoctorById(req.params.id, req.body);
  res.send(doctor);
});

const deleteDoctor = catchAsync(async (req, res) => {
  logger.info('Deleting doctor by ID:', req.params.id);
  await doctorService.deleteDoctorById(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
};
