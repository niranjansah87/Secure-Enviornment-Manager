/**
 * AuthService — credential verification, session management, password operations.
 *
 * Security:
 * - Argon2id for all password/API-key verification
 * - Constant-time master token comparison (HMAC safe-compare)
 * - No account enumeration — generic error messages for all auth failures
 * - Rate limiting checked before any credential verification
 */
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { safeCompare } from '@sem/crypto';
import type { UserRole } from '@sem/types';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';
import { TokenService, type IssuedTokens } from './token.service';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { MetricsService } from '../../infra/observability/metrics.service';
import { AuditService } from '../audit/audit.service';

export interface LoginCredentials {
  organization?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  masterToken?: string;
  deviceName?: string;
  deviceIp?: string;
  userAgent?: string;
}

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: RateLimitService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditService,
  ) {}

  async login(creds: LoginCredentials): Promise<IssuedTokens & { mustChangePassword: boolean }> {
    const ip = creds.deviceIp ?? 'unknown';

    // Rate limit check before any credential work
    const maxAttempts = this.config.get<number>('app.rateLimits.loginMaxAttempts', 5);
    const windowSecs = this.config.get<number>('app.rateLimits.loginWindowSeconds', 900);

    if (await this.rateLimiter.isLoginBlocked(ip, maxAttempts)) {
      this.metrics.rateLimitEventsTotal.inc({ endpoint: 'login' });
      throw new ForbiddenException({ code: 'ACCOUNT_LOCKED', message: 'Too many login attempts. Try again later.' });
    }

    let result: IssuedTokens & { mustChangePassword: boolean } | null = null;

    try {
      if (creds.masterToken) {
        result = await this.loginWithMasterToken(creds);
      } else if (creds.apiKey) {
        result = await this.loginWithApiKey(creds);
      } else if (creds.username && creds.password) {
        result = await this.loginWithPassword(creds);
      } else {
        throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
      }
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        // Only count failures from actual credential attempts
        if (!(err instanceof ForbiddenException && (err.getResponse() as Record<string, string>)['code'] === 'ACCOUNT_LOCKED')) {
          await this.rateLimiter.recordLoginAttempt(ip, maxAttempts, windowSecs);
          this.metrics.authFailuresTotal.inc({ method: this.detectMethod(creds), reason: 'invalid_credentials' });
        }
        throw err;
      }
      throw err;
    }

    // Success — reset rate limit
    await this.rateLimiter.resetLoginAttempts(ip);
    this.metrics.authAttemptsTotal.inc({ method: this.detectMethod(creds), result: 'success' });
    return result;
  }

  private async loginWithMasterToken(
    creds: LoginCredentials,
  ): Promise<IssuedTokens & { mustChangePassword: boolean }> {
    const configuredToken = this.config.get<string>('app.masterToken');
    if (!configuredToken) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }
    if (!safeCompare(creds.masterToken!, configuredToken)) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    // Master token creates a synthetic admin session in the default org
    const [org] = await this.db.select().from(schema.organizations).limit(1);
    if (!org) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    const [master] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.orgId, org.id), eq(schema.users.username, 'master'), eq(schema.users.isActive, true)))
      .limit(1);
    if (!master) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    const tokens = await this.tokenService.issueTokens({
      userId: master.id,
      orgId: org.id,
      role: 'admin',
      scopes: ['*'],
      mustChangePassword: false,
      authMethod: 'master_token',
      deviceName: creds.deviceName,
      deviceIp: creds.deviceIp,
      userAgent: creds.userAgent,
    });
    await this.audit.writeEvent({ orgId: org.id, actorId: master.id, actorType: 'user', action: 'auth.login', resourceType: 'session', resourceId: tokens.sessionId, metadata: { method: 'master_token' }, ip: creds.deviceIp });

    return { ...tokens, mustChangePassword: false };
  }

  private async loginWithPassword(
    creds: LoginCredentials,
  ): Promise<IssuedTokens & { mustChangePassword: boolean }> {
    // Find user — don't reveal whether username exists
    const matches = await this.db
      .select({ user: schema.users })
      .from(schema.users)
      .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
      .where(
        creds.organization
          ? and(eq(schema.users.username, creds.username!), eq(schema.organizations.slug, creds.organization))
          : eq(schema.users.username, creds.username!),
      )
      .limit(2);
    const user = matches.length === 1 ? matches[0]!.user : undefined;

    // Always run Argon2 verify even for non-existent users (prevents timing attack)
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const hashToVerify = user?.passwordHash ?? dummyHash;

    let verified = false;
    try {
      verified = await argon2.verify(hashToVerify, creds.password!, ARGON2_OPTIONS);
    } catch {
      verified = false;
    }

    if (!user || !verified || !user.isActive) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      orgId: user.orgId,
      role: user.role as UserRole,
      scopes: user.scopes,
      mustChangePassword: user.mustChangePassword,
      authMethod: 'user_password',
      deviceName: creds.deviceName,
      deviceIp: creds.deviceIp,
      userAgent: creds.userAgent,
    });
    await this.audit.writeEvent({ orgId: user.orgId, actorId: user.id, actorType: 'user', action: 'auth.login', resourceType: 'session', resourceId: tokens.sessionId, metadata: { method: 'user_password' }, ip: creds.deviceIp });

    return { ...tokens, mustChangePassword: user.mustChangePassword };
  }

  private async loginWithApiKey(
    creds: LoginCredentials,
  ): Promise<IssuedTokens & { mustChangePassword: boolean }> {
    const rawKey = creds.apiKey!;

    // Parse key format: sem_<identifier>_<secret>
    const match = rawKey.match(/^sem_([0-9a-f]{16})_(.+)$/);
    if (!match) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }
    const [, identifier, secret] = match;

    // O(1) prefix lookup
    const candidates = await this.db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.keyPrefix, identifier), eq(schema.apiKeys.revoked, false)))
      .limit(5); // limit to prevent DoS on colliding prefixes

    let matchedKey: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      // Check expiry
      if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

      try {
        const match = await argon2.verify(candidate.keyHash, secret!, ARGON2_OPTIONS);
        if (match) {
          matchedKey = candidate;
          break;
        }
      } catch {
        // Not this key
      }
    }

    if (!matchedKey) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    // Update last_used_at (fire and forget — don't block login on this)
    void this.db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, matchedKey.id));

    if (!matchedKey.userId) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, matchedKey.userId), eq(schema.users.isActive, true)))
      .limit(1);
    if (!user || user.orgId !== matchedKey.orgId) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    const tokens = await this.tokenService.issueTokens({
      userId: user.id,
      orgId: user.orgId,
      role: user.role as UserRole,
      scopes: matchedKey.scopes,
      mustChangePassword: user.mustChangePassword,
      authMethod: 'api_key',
      deviceName: creds.deviceName,
      deviceIp: creds.deviceIp,
      userAgent: creds.userAgent,
    });
    await this.audit.writeEvent({ orgId: user.orgId, actorId: user.id, actorType: 'api_key', action: 'auth.login', resourceType: 'session', resourceId: tokens.sessionId, metadata: { method: 'api_key', api_key_id: matchedKey.id }, ip: creds.deviceIp });

    return { ...tokens, mustChangePassword: user.mustChangePassword };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) throw new ForbiddenException({ code: 'NOT_FOUND', message: 'User not found' });

    const valid = await argon2.verify(user.passwordHash, currentPassword, ARGON2_OPTIONS);
    if (!valid) {
      throw new ForbiddenException({ code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' });
    }

    this.validatePasswordStrength(newPassword);

    const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await this.db
      .update(schema.users)
      .set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
    await this.audit.writeEvent({ orgId: user.orgId, actorId: user.id, actorType: 'user', action: 'auth.password_change', resourceType: 'user', resourceId: user.id, metadata: {} });
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 12) {
      throw new ForbiddenException({ code: 'INVALID_INPUT', message: 'Password must be at least 12 characters' });
    }
  }

  private detectMethod(creds: LoginCredentials): string {
    if (creds.masterToken) return 'master_token';
    if (creds.apiKey) return 'api_key';
    return 'user_password';
  }
}
