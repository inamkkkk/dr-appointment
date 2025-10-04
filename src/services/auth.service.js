const httpStatus = require('http-status');
const Doctor = require('../models/Doctor'); // Assuming doctors are the primary authenticated users
const ApiError = require('../utils/ApiError');
const { comparePassword } = require('../utils/password');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Doctor>}
 */
const loginDoctorWithEmailAndPassword = async (email, password) => {
  const doctor = await Doctor.findOne({ email });
  if (!doctor || !(await comparePassword(password, doctor.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return doctor;
};

module.exports = {
  loginDoctorWithEmailAndPassword,
};
