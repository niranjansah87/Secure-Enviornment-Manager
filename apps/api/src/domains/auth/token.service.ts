/**
 * TokenService — JWT issuance and refresh token lifecycle.
 *
 * Security model:
 * - ES256 asymmetric JWT; private key signs, public key verifies
 * - Refresh tokens stored as Argon2id hashes (integrity)
 *   AND HMAC-SHA256 lookup hashes (O(1) lookup, including revoked sessions)
 * - Rotation: old token revoked immediately on use
 * - Reuse detection: if the lookup finds a REVOKED session, the token
 *   was used after revocation → revoke ALL user sessions (entire family)
 */
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { and, eq, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { generateRefreshToken } from '@sem/crypto';
import type { JwtPayload, UserRole } from '@sem/types';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);
  private privateKey!: string;
  private publicKey!: string;
  private tokenHmacKey!: Buffer;

  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const privateKeyFile = this.config.get<string>('app.jwt.privateKeyFile');
    const publicKeyFile = this.config.get<string>('app.jwt.publicKeyFile');

    if (privateKeyFile) {
      this.privateKey = fs.readFileSync(privateKeyFile, 'utf8');
    } else {
      const key = this.config.get<string>('app.jwt.privateKey');
      if (!key) throw new Error('JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_FILE must be set');
      this.privateKey = key;
    }

    if (publicKeyFile) {
      this.publicKey = fs.readFileSync(publicKeyFile, 'utf8');
    } else {
      const key = this.config.get<string>('app.jwt.publicKey');
      if (!key) throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_FILE must be set');
      this.publicKey = key;
    }

    const hmacKeyB64 = this.config.get<string>('app.tokenHmacKey');
    if (!hmacKeyB64) throw new Error('SEM_TOKEN_HMAC_KEY must be set');
    const key = Buffer.from(hmacKeyB64, 'base64');
    if (key.byteLength < 32) throw new Error('SEM_TOKEN_HMAC_KEY must be at least 32 bytes');
    this.tokenHmacKey = key;
  }

  private computeLookupHmac(token: string): string {
    return crypto.createHmac('sha256', this.tokenHmacKey).update(token).digest('hex');
  }

  async issueTokens(params: {
    userId: string;
    orgId: string;
    role: UserRole;
    scopes: string[];
    mustChangePassword: boolean;
    authMethod: string;
    deviceName?: string;
    deviceIp?: string;
    userAgent?: string;
  }): Promise<IssuedTokens> {
    const accessTtl = this.config.get<number>('app.jwt.accessTokenTtl', 900);
    const refreshTtl = this.config.get<number>('app.jwt.refreshTokenTtl', 2592000);

    const refreshToken = generateRefreshToken();
    const [refreshHash, lookupHmac] = await Promise.all([
      argon2.hash(refreshToken, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      }),
      Promise.resolve(this.computeLookupHmac(refreshToken)),
    ]);

    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    const [session] = await this.db
      .insert(schema.sessions)
      .values({
        userId: params.userId,
        refreshTokenHash: refreshHash,
        refreshTokenLookupHmac: lookupHmac,
        deviceName: params.deviceName,
        deviceIp: params.deviceIp,
        userAgent: params.userAgent,
        expiresAt,
      })
      .returning({ id: schema.sessions.id });

    if (!session) throw new Error('Failed to create session');

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: params.userId,
      org: params.orgId,
      role: params.role,
      scopes: params.scopes,
      session_id: session.id,
      auth_method: params.authMethod as JwtPayload['auth_method'],
      iss: this.config.get<string>('app.jwt.issuer', 'sem-api'),
      aud: this.config.get<string>('app.jwt.audience', 'sem-web'),
      must_change_password: params.mustChangePassword,
    } as unknown as Omit<JwtPayload, 'iat' | 'exp'>;

    const accessToken = jwt.sign(payload as object, this.privateKey, {
      algorithm: 'ES256',
      expiresIn: accessTtl,
    });

    return { accessToken, refreshToken, sessionId: session.id };
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    deviceIp?: string,
  ): Promise<IssuedTokens | null> {
    // O(1) lookup via HMAC — finds session regardless of revoked status.
    // This is intentional: we must detect reuse even of revoked tokens.
    const lookupHmac = this.computeLookupHmac(oldRefreshToken);

    const [matchedSession] = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.refreshTokenLookupHmac, lookupHmac))
      .limit(1);

    if (!matchedSession) {
      this.logger.warn('Refresh token not found by lookup hmac');
      return null;
    }

    // Argon2 verify confirms the token matches the stored hash (integrity check)
    let hashMatch = false;
    try {
      hashMatch = await argon2.verify(matchedSession.refreshTokenHash, oldRefreshToken);
    } catch {
      // Malformed token — reject
    }

    if (!hashMatch) {
      this.logger.warn(`HMAC matched but Argon2 verification failed for session ${matchedSession.id} — possible HMAC collision or tampered token`);
      return null;
    }

    // REUSE DETECTION: token was already revoked but is being presented again.
    // Revoke the entire user's session family — assume all sessions are compromised.
    if (matchedSession.revoked) {
      this.logger.warn(`Refresh token reuse detected for user ${matchedSession.userId} — revoking ALL sessions`);
      await this.revokeAllUserSessions(matchedSession.userId, 'refresh_token_reuse');
      return null;
    }

    if (matchedSession.expiresAt < new Date()) {
      await this.revokeSession(matchedSession.id, 'expired');
      return null;
    }

    // Rotate: revoke old session before issuing new one
    await this.db
      .update(schema.sessions)
      .set({ revoked: true, revokedAt: new Date(), revokedReason: 'rotated' })
      .where(eq(schema.sessions.id, matchedSession.id));

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, matchedSession.userId))
      .limit(1);

    if (!user || !user.isActive) return null;

    return this.issueTokens({
      userId: user.id,
      orgId: user.orgId,
      role: user.role as UserRole,
      scopes: user.scopes,
      mustChangePassword: user.mustChangePassword,
      authMethod: 'user_password',
      deviceName: matchedSession.deviceName ?? undefined,
      deviceIp: deviceIp ?? matchedSession.deviceIp ?? undefined,
      userAgent: matchedSession.userAgent ?? undefined,
    });
  }

  async revokeSession(sessionId: string, reason = 'logout'): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({ revoked: true, revokedAt: new Date(), revokedReason: reason })
      .where(eq(schema.sessions.id, sessionId));
  }

  async revokeAllUserSessions(userId: string, reason = 'logout_all'): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({ revoked: true, revokedAt: new Date(), revokedReason: reason })
      .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.revoked, false)));
  }

  async getActiveSessions(userId: string): Promise<(typeof schema.sessions.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.revoked, false)));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .update(schema.sessions)
      .set({ revoked: true, revokedReason: 'expired' })
      .where(and(eq(schema.sessions.revoked, false), lt(schema.sessions.expiresAt, new Date())));

    return (result as unknown as { rowCount: number }).rowCount ?? 0;
  }
}
