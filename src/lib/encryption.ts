/**
 * AES-256-GCM encryption utilities for storing sensitive credentials
 * (OAuth tokens, basic auth passwords) at rest.
 *
 * Requires the environment variable ENCRYPTION_KEY to be set to a
 * 32-byte value encoded as 64 hexadecimal characters.
 *
 * Encrypted output format (base64):  iv:authTag:ciphertext
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'It must be a 64-character hex string (32 bytes).',
    );
  }
  if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).',
    );
  }
  return Buffer.from(hex, 'hex');
}

// ─── Encrypt ────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @returns A string in the format `iv:authTag:ciphertext` where each
 *          segment is base64-encoded.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

// ─── Decrypt ────────────────────────────────────────────────────────────────

/**
 * Decrypts a string that was produced by {@link encrypt}.
 *
 * @param encrypted The `iv:authTag:ciphertext` string.
 * @returns The original plaintext.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted format. Expected "iv:authTag:ciphertext".',
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
