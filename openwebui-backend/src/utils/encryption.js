import crypto from 'crypto';

// Encryption settings
// ENCRYPTION_KEY should be a secret provided in env; we derive a 32-byte key from it
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-min-32-chars-long!!'; // set in environment variables
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // For GCM, recommended IV length is 12 bytes
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'hex';

// Derive a fixed-length 32-byte key from the configured ENCRYPTION_KEY using SHA-256
const DERIVED_KEY = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

/**
 * Encrypts an API key using AES-256-GCM
 * @param {string} apiKey - The API key to encrypt
 * @returns {string} - The encrypted API key in format: iv:authTag:encryptedData
 */
export function encryptApiKey(apiKey) {
  if (!apiKey) throw new Error('API key is required');

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
  // Create cipher using the derived 32-byte key
  const cipher = crypto.createCipheriv(ALGORITHM, DERIVED_KEY, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(apiKey, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Return the IV, auth tag, and encrypted data as a single string
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypts an encrypted API key
 * @param {string} encryptedData - The encrypted API key in format: iv:authTag:encryptedData
 * @returns {string} - The decrypted API key
 */
export function decryptApiKey(encryptedData) {
  if (!encryptedData) throw new Error('Encrypted data is required');

  try {
    // Split the encrypted data into its components
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const encrypted = Buffer.from(encryptedHex, ENCODING);

    // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, DERIVED_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}
