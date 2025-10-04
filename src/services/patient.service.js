const httpStatus = require('http-status');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');

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
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryPatients = async (filter, options) => {
  // TODO: Implement pagination and filtering options if needed
  const patients = await Patient.find(filter);
  return patients;
};

/**
 * Get patient by id
 * @param {ObjectId} id
 * @returns {Promise<Patient>}
 */
const getPatientById = async (id) => {
  return Patient.findById(id);
};

/**
 * Update patient by id
 * @param {ObjectId} patientId
 * @param {Object} updateBody
 * @returns {Promise<Patient>}
 */
const updatePatientById = async (patientId, updateBody) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
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
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }
  await patient.remove();
  return patient;
};

module.exports = {
  createPatient,
  queryPatients,
  getPatientById,
  updatePatientById,
  deletePatientById,
};
