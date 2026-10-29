import { describe, expect, it } from 'vitest';
import * as argon2 from 'argon2';
import { generateEs256KeyPair } from '@sem/crypto';
import { TokenService } from '../../../src/domains/auth/token.service';
import * as schema from '../../../src/infra/database/schema';

describe('TokenService refresh rotation', () => {
  it('allows only one concurrent consumer of a refresh token', async () => {
    const oldToken = 'semr_' + 'x'.repeat(64);
    const refreshTokenHash = await argon2.hash(oldToken);
    const { privateKey, publicKey } = generateEs256KeyPair();
    const configValues: Record<string, unknown> = {
      'app.jwt.privateKey': privateKey,
      'app.jwt.publicKey': publicKey,
      'app.tokenHmacKey': Buffer.alloc(32, 7).toString('base64'),
      'app.jwt.accessTokenTtl': 900,
      'app.jwt.refreshTokenTtl': 2592000,
      'app.jwt.issuer': 'sem-api',
      'app.jwt.audience': 'sem-web',
    };
    const config = { get: (key: string, fallback?: unknown) => configValues[key] ?? fallback };
    const matchedSession = {
      id: 'session-old',
      userId: 'user-1',
      refreshTokenHash,
      refreshTokenLookupHmac: '',
      deviceName: null,
      deviceIp: null,
      userAgent: null,
      authMethod: 'user_password',
      authRole: 'developer',
      authScopes: ['secrets:read'],
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    };
    const user = {
      id: 'user-1',
      orgId: 'org-1',
      role: 'developer',
      scopes: ['secrets:read'],
      mustChangePassword: false,
      isActive: true,
    };
    let consumed = false;
    let issued = 0;
    const db = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () => table === schema.sessions ? [matchedSession] : [user],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => {
              if (consumed) return [];
              consumed = true;
              return [{ id: matchedSession.id }];
            },
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: `session-new-${++issued}` }],
        }),
      }),
    };

    const service = new TokenService(db as never, config as never);
    service.onModuleInit();
    const results = await Promise.all([
      service.rotateRefreshToken(oldToken),
      service.rotateRefreshToken(oldToken),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(issued).toBe(1);
  });
});
