/**
 * AES-256-GCM envelope encryption.
 *
 * Hierarchy: Master Key → KEK (per project) → DEK (per environment) → Secret Value
 *
 * Every encryption uses:
 *   - 32-byte key
 *   - 12-byte cryptographically random nonce (never reused with same key)
 *   - 16-byte GCM authentication tag
 *   - AAD that binds the ciphertext to its intended resource location
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export const AES_ALGO = 'aes-256-gcm' as const;
export const NONCE_LEN = 12;
export const TAG_LEN = 16;
export const KEY_LEN = 32;

export interface EncryptedBlob {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
  aad: Buffer;
}

export interface EncryptInput {
  plaintext: string;
  key: Buffer;
  /** Additional authenticated data — binds ciphertext to its resource. */
  aad: Buffer;
}

export interface DecryptInput {
  ciphertext: Buffer;
  key: Buffer;
  nonce: Buffer;
  tag: Buffer;
  aad: Buffer;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a fresh nonce every call — never reuse.
 */
export function encryptValue(input: EncryptInput): EncryptedBlob {
  if (input.key.length !== KEY_LEN) {
    throw new Error(`Encryption key must be ${KEY_LEN} bytes`);
  }
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(AES_ALGO, input.key, nonce);
  cipher.setAAD(input.aad);
  const ciphertext = Buffer.concat([
    cipher.update(input.plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return { ciphertext, nonce, tag, aad: input.aad };
}

/**
 * Decrypt an AES-256-GCM blob.
 * Throws if authentication fails (tampered ciphertext, wrong key, wrong AAD).
 */
export function decryptValue(input: DecryptInput): string {
  if (input.key.length !== KEY_LEN) {
    throw new Error(`Decryption key must be ${KEY_LEN} bytes`);
  }
  const decipher = createDecipheriv(AES_ALGO, input.key, input.nonce);
  decipher.setAAD(input.aad);
  decipher.setAuthTag(input.tag);
  const plain = Buffer.concat([
    decipher.update(input.ciphertext),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

/**
 * Wrap a DEK/KEK with another key (key-wrapping = encrypt key bytes).
 * The wrapped key bytes are the "plaintext" — still AES-256-GCM.
 */
export function wrapKey(keyToWrap: Buffer, wrapperKey: Buffer, aad: Buffer): EncryptedBlob {
  return encryptValue({ plaintext: keyToWrap.toString('base64'), key: wrapperKey, aad });
}

/** Unwrap a wrapped key. */
export function unwrapKey(blob: EncryptedBlob, wrapperKey: Buffer): Buffer {
  const b64 = decryptValue({
    ciphertext: blob.ciphertext,
    key: wrapperKey,
    nonce: blob.nonce,
    tag: blob.tag,
    aad: blob.aad,
  });
  return Buffer.from(b64, 'base64');
}

/**
 * Build AAD for a secret value.
 * Binds ciphertext to its exact location — prevents moving a ciphertext
 * to another secret/environment and decrypting it there.
 */
export function buildSecretAad(params: {
  secretId: string;
  environmentId: string;
  key: string;
  version: number;
  dekVersion: number;
}): Buffer {
  return Buffer.from(
    `sem:secret:${params.secretId}:${params.environmentId}:${params.key}:v${params.version}:dek${params.dekVersion}`,
    'utf8',
  );
}

/** Build AAD for a key-encryption operation. */
export function buildKeyAad(params: {
  scopeType: 'project' | 'environment';
  scopeId: string;
  keyVersion: number;
}): Buffer {
  return Buffer.from(
    `sem:key:${params.scopeType}:${params.scopeId}:v${params.keyVersion}`,
    'utf8',
  );
}

/** Serialize an EncryptedBlob to a compact binary buffer for DB storage. */
export function serializeBlob(blob: EncryptedBlob): {
  encryptedValue: Buffer;
  nonce: Buffer;
  tag: Buffer;
  aad: Buffer;
} {
  return {
    encryptedValue: blob.ciphertext,
    nonce: blob.nonce,
    tag: blob.tag,
    aad: blob.aad,
  };
}
