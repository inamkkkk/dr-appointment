const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { queryOrchestrator, appointmentService } = require('../services');
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

const createAppointment = catchAsync(async (req, res) => {
  logger.info('Creating new appointment.');
  // TODO: Add input validation for the create appointment request body.
  const appointment = await queryOrchestrator.createAppointment(req.body);
  res.status(httpStatus.CREATED).send(appointment);
});

const getAppointments = catchAsync(async (req, res) => {
  logger.info('Fetching appointments.');
  // TODO: Implement filtering and pagination for the get appointments request.
  const appointments = await appointmentService.queryAppointments();
  res.send(appointments);
});

const getAppointment = catchAsync(async (req, res) => {
  logger.info('Fetching appointment by ID:', req.params.id);
  // TODO: Add validation for the appointment ID parameter.
  const appointment = await appointmentService.getAppointmentById(req.params.id);
  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Appointment not found');
  }
  res.send(appointment);
});

const updateAppointment = catchAsync(async (req, res) => {
  logger.info('Updating appointment by ID:', req.params.id);
  // TODO: Add input validation for the update appointment request body.
  // TODO: Add validation for the appointment ID parameter.
  const appointment = await appointmentService.updateAppointmentById(req.params.id, req.body);
  res.send(appointment);
});

module.exports = {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment};