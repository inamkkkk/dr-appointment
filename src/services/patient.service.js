const httpStatus = require('http-status');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate'); // Assuming paginate utility exists or will be added

/**
 * Create a patient
 * @param {Object} patientBody
 * @returns {Promise<Patient>}
 */
const createPatient = async (patientBody) => {
  // In a real application, you might want to check if a patient with the same phone/whatsapp_number already exists
  // For this skeleton, we'll assume uniqueness is handled by business logic or not strictly enforced here.
  const patient = await Patient.create(patientBody);
  return patient;
};

/**
 * Query for patients
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options (e.g., page, limit, sortBy)
 * @returns {Promise<QueryResult>}
 */
const queryPatients = async (filter, options) => {
  // TODO: Implement pagination and filtering options if needed
  const { limit, page } = options;
  const startIndex = (page - 1) * limit;

  const patients = await Patient.find(filter).skip(startIndex).limit(limit);
  const totalResults = await Patient.countDocuments(filter);
  const totalPages = Math.ceil(totalResults / limit);

  return {
    results: patients,
    page,
    limit,
    totalPages,
    totalResults};
};

/**
 * Get patient by id
 * @param {ObjectId} id
 * @returns {Promise<Patient>}
 */
const getPatientById = async (id) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  return patient;
};

/**
 * Update patient by id
 * @param {ObjectId} patientId
 * @param {Object} updateBody
 * @returns {Promise<Patient>}
 */
const updatePatientById = async (patientId, updateBody) => {
  const patient = await getPatientById(patientId); // Use getPatientById to ensure patient exists and handle NOT_FOUND
  Object.assign(patient, updateBody);
  await patient.save();
  return patient;
};

/**
 * Delete patient by id
 * @param {ObjectId} patientId
 * @returns {Promise<Patient>}
 */
const deletePatientById = async (patientId) => {
  const patient = await getPatientById(patientId); // Use getPatientById to ensure patient exists and handle NOT_FOUND
  await patient.remove();
  return patient;
};

module.exports = {
  createPatient,
  queryPatients,
  getPatientById,
  updatePatientById,
  deletePatientById};