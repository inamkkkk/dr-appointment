const httpStatus = require('http-status');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const {
  paginateResults
} = require('../utils/pagination'); // Assuming you have a pagination utility

/**
 * Create an appointment (direct DB creation, typically used by QueryOrchestrator)
 * @param {Object} appointmentBody
 * @returns {Promise<Appointment>}
 */
const createAppointment = async (appointmentBody) => {
  // TODO: Add validation for appointmentBody before creating
  const appointment = await Appointment.create(appointmentBody);
  return appointment;
};

/**
 * Query for appointments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: property (e.g. name)
 * @param {string} [options.limit] - Max number of results per page (default: 10)
 * @param {string} [options.page] - Current page of results (default: 1)
 * @returns {Promise<QueryResult>}
 */
const queryAppointments = async (filter, options) => {
  const appointments = await Appointment.paginate(filter, options); // Use paginate from mongoose-paginate-v2
  // Populate doctor/patient info - this is already done in the original code, but can be enhanced
  // if specific fields are needed or if the populate structure needs to be dynamic based on filter/options
  // For now, keeping the existing populate as it's functional.
  const populatedAppointments = await Appointment.find(filter)
    .populate('doctor_id', 'name specialization')
    .populate('patient_id', 'name phone')
    .sort({
      [options.sortBy]: options.sortOrder === 'desc' ? -1 : 1
    }) // Added basic sorting
    .skip(options.skip) // Added pagination skip
    .limit(options.limit); // Added pagination limit

  return {
    results: populatedAppointments,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(appointments.totalDocs / options.limit),
    totalResults: appointments.totalDocs};
};

/**
 * Get appointment by id
 * @param {ObjectId} id
 * @returns {Promise<Appointment>}
 */
const getAppointmentById = async (id) => {
  // TODO: Add validation for id format
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
  // TODO: Add validation for updateBody and check for fields that should not be updated
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
  await appointment.remove(); // Using remove() is deprecated, consider deleteOne() or findByIdAndDelete()
  return appointment;
};

module.exports = {
  createAppointment,
  queryAppointments,
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById};