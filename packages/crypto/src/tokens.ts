/**
 * Cryptographically secure token generation and hashing.
 */
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/** Generate a cryptographically random opaque token. */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/** Generate a refresh token with prefix for identification. */
export function generateRefreshToken(): string {
  return `semr_${generateToken(48)}`;
}

/** SHA-256 hash of a token for storage. Never store tokens in plaintext. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time token comparison to prevent timing attacks. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** Generate API key in sem_<identifier>_<secret> format. */
export function generateApiKey(): { raw: string; identifier: string; secret: string } {
  const identifier = randomBytes(8).toString('hex');  // 16 hex chars
  const secret = randomBytes(32).toString('base64url'); // 43 chars
  const raw = `sem_${identifier}_${secret}`;
  return { raw, identifier, secret };
}

/** Parse an API key string into its components. */
export function parseApiKey(raw: string): { identifier: string; secret: string } | null {
  const match = raw.match(/^sem_([0-9a-f]{16})_(.+)$/);
  if (!match) return null;
  return { identifier: match[1], secret: match[2] };
}
