const crypto = require('crypto');
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

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY;
const ivLength = parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10);

if (!secretKey || secretKey.length !== 32) {
  logger.error('ENCRYPTION_KEY must be a 32-byte string for AES-256. Please check your .env file.');
  process.exit(1);
}

/**
 * Encrypts sensitive data using AES-256-GCM.
 * @param {string | Date | number} text - The data to encrypt. Will be stringified.
 * @returns {string} - The encrypted data (iv, ciphertext, tag base64 encoded and joined).
 */
const encrypt = (text) => {
  if (text === null || text === undefined) return text; // Allow null/undefined to pass through
  const stringifiedText = String(text);
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(stringifiedText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  // Ensure all parts are hex encoded for consistent parsing
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
};

/**
 * Decrypts sensitive data encrypted with AES-256-GCM.
 * @param {string} encryptedText - The encrypted data string.
 * @returns {string | null} - The decrypted data, or null if decryption fails.
 */
const decrypt = (encryptedText) => {
  if (encryptedText === null || encryptedText === undefined) return encryptedText;
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    logger.error('Invalid encrypted data format. Expected format: iv:encrypted:tag');
    return null; // Return null to indicate failure
  }
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    const encrypted = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error({ error, encryptedText }, 'Decryption failed.');
    return null; // Return null on decryption error
  }
};

module.exports = {
  encrypt,
  decrypt};