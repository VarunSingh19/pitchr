import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length !== 32) {
    throw new Error(
      "ENCRYPTION_SECRET must be exactly 32 characters. Set it in your .env file."
    );
  }
  return Buffer.from(secret, "utf-8");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex-encoded string: iv + authTag + ciphertext.
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv (hex) + authTag (hex) + ciphertext (hex)
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * Decrypt a hex-encoded ciphertext produced by encrypt().
 * Returns the original plaintext string.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();

  // Extract IV, authTag, and encrypted data
  const ivHex = ciphertext.slice(0, IV_LENGTH * 2);
  const authTagHex = ciphertext.slice(
    IV_LENGTH * 2,
    IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2
  );
  const encryptedHex = ciphertext.slice(
    IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2
  );

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string looks like an encrypted value (hex-encoded with correct prefix length).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const minLength = (IV_LENGTH + AUTH_TAG_LENGTH) * 2 + 2; // at least 1 char encrypted
  return /^[0-9a-f]+$/i.test(value) && value.length >= minLength;
}
