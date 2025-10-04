const httpStatus = require('http-status');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');

/**
 * Create a doctor
 * @param {Object} doctorBody
 * @returns {Promise<Doctor>}
 */
const createDoctor = async (doctorBody) => {
  if (await Doctor.isEmailTaken(doctorBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const hashedPassword = await hashPassword(doctorBody.password);
  const doctor = await Doctor.create({ ...doctorBody, password: hashedPassword });
  return doctor;
};

/**
 * Query for doctors
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: property (e.g. name)
 * @param {number} [options.limit] - Max number of results per page (default: 10)
 * @param {number} [options.page] - Current page of results (default: 1)
 * @returns {Promise<QueryResult>}
 */
const queryDoctors = async (filter, options) => {
  // TODO: Implement pagination and filtering options if needed
  const { sortBy, limit = 10, page = 1 } = options;
  const sort = sortBy ? `-${sortBy}` : '-createdAt'; // Default sort by creation date

  const doctors = await Doctor.paginate(filter, { page, limit, sortBy: sort });
  return doctors;
};

/**
 * Get doctor by id
 * @param {ObjectId} id
 * @returns {Promise<Doctor>}
 */
const getDoctorById = async (id) => {
  return Doctor.findById(id).select('-password');
};

/**
 * Get doctor by email
 * @param {string} email
 * @returns {Promise<Doctor>}
 */
const getDoctorByEmail = async (email) => {
  return Doctor.findOne({ email }).select('-password');
};

/**
 * Update doctor by id
 * @param {ObjectId} doctorId
 * @param {Object} updateBody
 * @returns {Promise<Doctor>}
 */
const updateDoctorById = async (doctorId, updateBody) => {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found');
  }
  if (updateBody.email && (await Doctor.isEmailTaken(updateBody.email, doctorId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.password) {
    updateBody.password = await hashPassword(updateBody.password);
  }
  Object.assign(doctor, updateBody);
  await doctor.save();
  return doctor;
};

/**
 * Delete doctor by id
 * @param {ObjectId} doctorId
 * @returns {Promise<Doctor>}
 */
const deleteDoctorById = async (doctorId) => {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found');
  }
  await doctor.remove();
  return doctor;
};

// Add a static method to the Doctor schema for email validation
Doctor.schema.statics.isEmailTaken = async function (email, excludeDoctorId) {
  const doctor = await this.findOne({ email, _id: { $ne: excludeDoctorId } });
  return !!doctor;
};

// Add pagination plugin to Doctor schema if not already present
// Assuming you have a plugin like 'mongoose-paginate-v2' installed and configured
if (!Doctor.schema.plugin) {
  const mongoosePaginate = require('mongoose-paginate-v2');
  Doctor.schema.plugin(mongoosePaginate);
}


module.exports = {
  createDoctor,
  queryDoctors,
  getDoctorById,
  getDoctorByEmail,
  updateDoctorById,
  deleteDoctorById};