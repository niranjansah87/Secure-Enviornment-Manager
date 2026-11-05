import { describe, it, expect } from 'vitest';
import { generateApiKey, parseApiKey, generateRefreshToken, safeCompare } from './tokens';

describe('generateApiKey / parseApiKey', () => {
  it('generates keys that parse correctly', () => {
    const { raw, identifier, secret } = generateApiKey();
    const parsed = parseApiKey(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.identifier).toBe(identifier);
    expect(parsed!.secret).toBe(secret);
  });

  it('raw key format matches sem_<hex>_<secret>', () => {
    const { raw } = generateApiKey();
    expect(raw).toMatch(/^sem_[0-9a-f]{16}_.+$/);
  });

  it('returns null for malformed keys', () => {
    expect(parseApiKey('not-a-key')).toBeNull();
    expect(parseApiKey('sem_tooshort_secret')).toBeNull();
    expect(parseApiKey('')).toBeNull();
  });

  it('generates unique identifiers each call', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.identifier).not.toBe(b.identifier);
    expect(a.secret).not.toBe(b.secret);
  });
});

describe('generateRefreshToken', () => {
  it('uses semr_ prefix', () => {
    expect(generateRefreshToken()).toMatch(/^semr_/);
  });

  it('generates unique values', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});

describe('safeCompare', () => {
  it('returns true for equal strings', () => {
    expect(safeCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(safeCompare('aaaaaa', 'aaaaab')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(safeCompare('short', 'longer')).toBe(false);
  });
});
