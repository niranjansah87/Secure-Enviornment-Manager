/**
 * Fernet token decryption — Node.js implementation.
 *
 * Fernet spec: https://github.com/fernet/spec/blob/master/Spec.md
 *   Key  = base64url(signing_key[16] || encryption_key[16])
 *   Token = base64url(version[1] || timestamp[8] || iv[16] || ciphertext[N] || hmac[32])
 *   Cipher: AES-128-CBC, PKCS#7 padding
 *   MAC:    HMAC-SHA256 over version+timestamp+iv+ciphertext
 */
import { createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto';

const FERNET_VERSION = 0x80;
const HMAC_LEN = 32;
const IV_LEN = 16;
const TIMESTAMP_LEN = 8;
const HEADER_LEN = 1 + TIMESTAMP_LEN + IV_LEN; // version + timestamp + IV

/**
 * Decode a URL-safe base64 string to a Buffer.
 * Fernet uses URL-safe base64 without padding.
 */
function b64urlDecode(s: string): Buffer {
  // Restore standard base64 padding
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(b64, 'base64');
}

/**
 * Decrypt a Fernet token.
 *
 * @param fernetKeyB64 - URL-safe base64 Fernet key (44 chars → 32 bytes)
 * @param token        - URL-safe base64 Fernet token
 * @returns Decrypted plaintext as string
 * @throws if signature is invalid or decryption fails
 */
export function fernetDecrypt(fernetKeyB64: string, token: string): string {
  const keyBytes = b64urlDecode(fernetKeyB64);
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid Fernet key length: ${keyBytes.length} (expected 32)`);
  }

  const signingKey = keyBytes.subarray(0, 16);
  const encryptionKey = keyBytes.subarray(16, 32);

  const tokenBytes = b64urlDecode(token);
  if (tokenBytes.length < HEADER_LEN + HMAC_LEN) {
    throw new Error('Fernet token too short');
  }

  // Parse token
  const version = tokenBytes[0];
  if (version !== FERNET_VERSION) {
    throw new Error(`Unknown Fernet version: 0x${version?.toString(16)}`);
  }

  const hmacOffset = tokenBytes.length - HMAC_LEN;
  const data = tokenBytes.subarray(0, hmacOffset);       // version+timestamp+iv+ciphertext
  const storedHmac = tokenBytes.subarray(hmacOffset);
  const iv = tokenBytes.subarray(1 + TIMESTAMP_LEN, HEADER_LEN);
  const ciphertext = tokenBytes.subarray(HEADER_LEN, hmacOffset);

  // Verify HMAC-SHA256(signing_key, version+timestamp+iv+ciphertext)
  const computedHmac = createHmac('sha256', signingKey).update(data).digest();
  if (!timingSafeEqual(storedHmac, computedHmac)) {
    throw new Error('Fernet HMAC verification failed — invalid key or corrupted token');
  }

  // Decrypt AES-128-CBC
  const decipher = createDecipheriv('aes-128-cbc', encryptionKey, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
