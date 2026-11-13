import crypto from 'node:crypto';

// 256-bit encryption key derived from SESSION_PASSWORD or dedicated ENCRYPTION_KEY
const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_PASSWORD || 'default-fallback-key-32-chars-long!!';
const KEY = crypto.createHash('sha256').update(SECRET_KEY).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts sensitive text using AES-256-GCM authenticated encryption.
 * Output format: base64(iv + authTag + encryptedData)
 */
export function encryptData(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Combined buffer: IV (16B) + AuthTag (16B) + Ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts AES-256-GCM encrypted ciphertext.
 */
export function decryptData(cipherTextBase64: string): string {
  if (!cipherTextBase64) return '';
  try {
    const combined = Buffer.from(cipherTextBase64, 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return cipherTextBase64; // Not encrypted with this format, return as-is
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    // If decryption fails (e.g. legacy plain text), safely return original
    return cipherTextBase64;
  }
}
