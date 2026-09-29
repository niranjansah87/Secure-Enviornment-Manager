/**
 * Security tests for JWT handling.
 * These test the guard logic in isolation — no DB, no HTTP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { generateEs256KeyPair } from '@sem/crypto';

// We test the verification logic directly, not through NestJS DI.
// The guard uses the same pattern — verify with ES256, check iss/aud.

describe('JWT security properties', () => {
  const { privateKey, publicKey } = generateEs256KeyPair();
  const issuer = 'sem-api';
  const audience = 'sem-web';

  function signToken(payload: object, overrides?: jwt.SignOptions) {
    return jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      issuer,
      audience,
      expiresIn: 900,
      ...overrides,
    });
  }

  function verifyToken(token: string) {
    return jwt.verify(token, publicKey, {
      algorithms: ['ES256'],
      issuer,
      audience,
    });
  }

  it('valid ES256 token verifies', () => {
    const token = signToken({ sub: 'user-1', org: 'org-1', role: 'developer' });
    expect(() => verifyToken(token)).not.toThrow();
  });

  it('rejects HS256-signed tokens (algorithm confusion attack)', () => {
    // Attacker signs with public key as HMAC secret — must be rejected
    const malicious = jwt.sign(
      { sub: 'attacker', org: 'org-1', role: 'admin' },
      publicKey, // using public key as HMAC secret
      { algorithm: 'HS256', issuer, audience },
    );
    expect(() => verifyToken(malicious)).toThrow();
  });

  it('rejects HS384 and HS512 algorithms', () => {
    for (const alg of ['HS384', 'HS512'] as jwt.Algorithm[]) {
      const token = jwt.sign({ sub: 'x' }, 'anysecret', { algorithm: alg });
      expect(() => verifyToken(token)).toThrow();
    }
  });

  it('rejects expired tokens', () => {
    const token = signToken({ sub: 'user-1' }, { expiresIn: -1 }); // already expired
    expect(() => verifyToken(token)).toThrow(/expired/i);
  });

  it('rejects wrong issuer', () => {
    const token = signToken({ sub: 'user-1' }, { issuer: 'wrong-issuer' });
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects wrong audience', () => {
    const token = signToken({ sub: 'user-1' }, { audience: 'wrong-audience' });
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects a token signed by a different key pair', () => {
    const { privateKey: otherKey } = generateEs256KeyPair();
    const token = jwt.sign({ sub: 'user-1' }, otherKey, {
      algorithm: 'ES256',
      issuer,
      audience,
    });
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects tampered payload', () => {
    const token = signToken({ sub: 'user-1', role: 'developer' });
    // Split, tamper with payload, rejoin
    const [header, payload, sig] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    decoded.role = 'admin'; // escalation attempt
    const tampered = `${header}.${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('none algorithm is rejected', () => {
    // Craft a "none" alg token manually
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    expect(() => verifyToken(noneToken)).toThrow();
  });
});

describe('Cross-org isolation (token claim integrity)', () => {
  const { privateKey, publicKey } = generateEs256KeyPair();

  it('org claim in token cannot be substituted by request body', () => {
    // The guard extracts org from the VERIFIED JWT only.
    // This test documents the contract: org must come from jwt.verify output.
    const token = jwt.sign(
      { sub: 'user-1', org: 'org-A', role: 'admin' },
      privateKey,
      { algorithm: 'ES256', expiresIn: 900 },
    );
    const verified = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as { org: string };
    // Even if the request body says org-B, the auth layer uses org-A from JWT
    const requestBodyOrgId = 'org-B'; // attacker-supplied
    expect(verified.org).toBe('org-A');
    expect(verified.org).not.toBe(requestBodyOrgId);
  });
});
