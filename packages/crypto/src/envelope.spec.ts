import { describe, it, expect } from 'vitest';
import {
  encryptValue,
  decryptValue,
  wrapKey,
  unwrapKey,
  buildSecretAad,
  buildKeyAad,
} from './envelope';
import { generateAesKey } from './keys';

describe('encryptValue / decryptValue', () => {
  it('round-trips plaintext', () => {
    const key = generateAesKey();
    const aad = Buffer.from('test-aad');
    const blob = encryptValue({ plaintext: 'hello world', key, aad });
    expect(decryptValue({ ciphertext: blob.ciphertext, key, nonce: blob.nonce, tag: blob.tag, aad })).toBe('hello world');
  });

  it('fails when ciphertext is tampered', () => {
    const key = generateAesKey();
    const aad = Buffer.from('test-aad');
    const blob = encryptValue({ plaintext: 'secret', key, aad });
    blob.ciphertext[0] ^= 0xff; // flip bit
    expect(() => decryptValue({ ciphertext: blob.ciphertext, key, nonce: blob.nonce, tag: blob.tag, aad })).toThrow();
  });

  it('fails when AAD changes (binding check)', () => {
    const key = generateAesKey();
    const aad = Buffer.from('original-aad');
    const blob = encryptValue({ plaintext: 'secret', key, aad });
    const wrongAad = Buffer.from('different-aad');
    expect(() => decryptValue({ ciphertext: blob.ciphertext, key, nonce: blob.nonce, tag: blob.tag, aad: wrongAad })).toThrow();
  });

  it('fails when wrong key used', () => {
    const key = generateAesKey();
    const wrongKey = generateAesKey();
    const aad = Buffer.from('test');
    const blob = encryptValue({ plaintext: 'secret', key, aad });
    expect(() => decryptValue({ ciphertext: blob.ciphertext, key: wrongKey, nonce: blob.nonce, tag: blob.tag, aad })).toThrow();
  });

  it('uses a fresh nonce each call', () => {
    const key = generateAesKey();
    const aad = Buffer.from('test');
    const b1 = encryptValue({ plaintext: 'same', key, aad });
    const b2 = encryptValue({ plaintext: 'same', key, aad });
    expect(b1.nonce.equals(b2.nonce)).toBe(false);
  });

  it('rejects key that is not 32 bytes', () => {
    const badKey = Buffer.alloc(16); // 128-bit, not 256-bit
    expect(() => encryptValue({ plaintext: 'x', key: badKey, aad: Buffer.from('a') })).toThrow();
  });
});

describe('wrapKey / unwrapKey', () => {
  it('round-trips a key', () => {
    const dek = generateAesKey();
    const kek = generateAesKey();
    const aad = buildKeyAad({ scopeType: 'environment', scopeId: 'env-1', keyVersion: 1 });
    const wrapped = wrapKey(dek, kek, aad);
    const unwrapped = unwrapKey(wrapped, kek);
    expect(unwrapped.equals(dek)).toBe(true);
  });
});

describe('buildSecretAad', () => {
  it('produces deterministic output', () => {
    const params = { secretId: 'sid', environmentId: 'eid', key: 'MY_KEY', version: 3, dekVersion: 1 };
    const a = buildSecretAad(params);
    const b = buildSecretAad(params);
    expect(a.equals(b)).toBe(true);
  });

  it('changes with any param change', () => {
    const base = { secretId: 'sid', environmentId: 'eid', key: 'K', version: 1, dekVersion: 1 };
    const aad = buildSecretAad(base);
    expect(buildSecretAad({ ...base, version: 2 }).equals(aad)).toBe(false);
    expect(buildSecretAad({ ...base, key: 'OTHER' }).equals(aad)).toBe(false);
    expect(buildSecretAad({ ...base, environmentId: 'other' }).equals(aad)).toBe(false);
  });
});
