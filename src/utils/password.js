const bcrypt = require('bcryptjs');

/**
 * Hash password
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  // TODO: Implement input validation for password to ensure it meets complexity requirements.
  // Consider adding checks for minimum length, presence of uppercase letters, lowercase letters, numbers, and special characters.
  // If validation fails, throw an appropriate error.

  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain password with hashed password
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashedPassword) => {
  // TODO: Add error handling for cases where the provided password or hashedPassword are not valid strings.
  // For example, if either is null, undefined, or not a string, return false or throw an error.
  
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword};