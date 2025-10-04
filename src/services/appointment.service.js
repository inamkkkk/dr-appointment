const httpStatus = require('http-status');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');

/**
 * Create an appointment (direct DB creation, typically used by QueryOrchestrator)
 * @param {Object} appointmentBody
 * @returns {Promise<Appointment>}
 */
const createAppointment = async (appointmentBody) => {
  const appointment = await Appointment.create(appointmentBody);
  return appointment;
};

/**
 * Query for appointments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryAppointments = async (filter, options) => {
  // TODO: Implement pagination, filtering, and populate doctor/patient info
  const appointments = await Appointment.find(filter).populate('doctor_id', 'name specialization').populate('patient_id', 'name phone');
  return appointments;
};

/**
 * Get appointment by id
 * @param {ObjectId} id
 * @returns {Promise<Appointment>}
 */
const getAppointmentById = async (id) => {
  return Appointment.findById(id).populate('doctor_id', 'name specialization').populate('patient_id', 'name phone');
};

/**
 * Update appointment by id
 * @param {ObjectId} appointmentId
 * @param {Object} updateBody
 * @returns {Promise<Appointment>}
 */
const updateAppointmentById = async (appointmentId, updateBody) => {
  const appointment = await getAppointmentById(appointmentId);
  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Appointment not found');
  }
  Object.assign(appointment, updateBody);
  await appointment.save();
  return appointment;
};

/**
 * Delete appointment by id
 * @param {ObjectId} appointmentId
 * @returns {Promise<Appointment>}
 */
const deleteAppointmentById = async (appointmentId) => {
  const appointment = await getAppointmentById(appointmentId);
  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Appointment not found');
  }
  await appointment.remove();
  return appointment;
};

module.exports = {
  createAppointment,
  queryAppointments,
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById,
};
