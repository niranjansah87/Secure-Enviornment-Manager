/**
 * Key generation utilities.
 */
import { randomBytes, generateKeyPairSync } from 'crypto';
import { KEY_LEN } from './envelope';

/** Generate a random 256-bit (32-byte) AES key. */
export function generateAesKey(): Buffer {
  return randomBytes(KEY_LEN);
}

/** Generate an ES256 (ECDSA P-256) key pair for JWT signing. */
export function generateEs256KeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}
