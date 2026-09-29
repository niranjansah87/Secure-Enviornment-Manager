import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';
import { generateApiKey, parseApiKey } from '@sem/crypto';
import { DB_TOKEN } from '../../infra/database/database.module';
import { AuditService } from '../audit/audit.service';
import * as schema from '../../infra/database/schema';

export const API_KEY_SCOPES = [
  'secrets:read',
  'secrets:write',
  'secrets:delete',
  'secrets:export',
  'admin:users',
  'admin:projects',
  'admin:environments',
] as const;

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly auditService: AuditService,
  ) {}

  async create(params: {
    orgId: string;
    name: string;
    scopes: string[];
    userId?: string;
    expiresAt?: Date;
    createdBy: string;
    callerRole: string;
    callerScopes: string[];
    ip?: string;
  }) {
    // Scope privilege check: non-admins can only grant scopes they hold
    if (params.callerRole !== 'admin') {
      const illegal = params.scopes.filter((s) => !params.callerScopes.includes(s));
      if (illegal.length > 0) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: `Cannot grant scopes not in your own scope set: ${illegal.join(', ')}`,
        });
      }
    }

    // User-binding validation: target user must exist in the same org
    if (params.userId) {
      const [targetUser] = await this.db
        .select({ id: schema.users.id, orgId: schema.users.orgId, isActive: schema.users.isActive })
        .from(schema.users)
        .where(and(eq(schema.users.id, params.userId), eq(schema.users.orgId, params.orgId), eq(schema.users.isActive, true)))
        .limit(1);

      if (!targetUser) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Target user not found in this organization',
        });
      }

      // Non-admins can only bind a key to themselves
      if (params.callerRole !== 'admin' && params.userId !== params.createdBy) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Only admins can bind API keys to other users',
        });
      }
    }

    const { raw: _raw, identifier, secret } = generateApiKey();

    const keyHash = await argon2.hash(secret, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const [apiKey] = await this.db
      .insert(schema.apiKeys)
      .values({
        orgId: params.orgId,
        userId: params.userId,
        name: params.name,
        keyHash,
        keyPrefix: identifier,
        scopes: params.scopes,
        expiresAt: params.expiresAt,
      })
      .returning();

    if (!apiKey) throw new Error('Failed to create API key');

    await this.auditService.writeEvent({
      orgId: params.orgId,
      actorId: params.createdBy,
      actorType: 'user',
      action: 'api_key.create',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      metadata: { name: params.name, scopes: params.scopes.join(',') },
      ip: params.ip,
    });

    // Return the full raw key only at creation time — never stored in plaintext
    return { apiKey, rawKey: `sem_${identifier}_${secret}` };
  }

  async verify(rawKey: string): Promise<typeof schema.apiKeys.$inferSelect | null> {
    const parsed = parseApiKey(rawKey);
    if (!parsed) return null;

    const candidates = await this.db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.keyPrefix, parsed.identifier), eq(schema.apiKeys.revoked, false)))
      .limit(5); // Small set — identifier provides good selectivity

    for (const candidate of candidates) {
      if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

      try {
        const match = await argon2.verify(candidate.keyHash, parsed.secret);
        if (match) {
          // Update last used timestamp — fire and forget
          this.db
            .update(schema.apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(schema.apiKeys.id, candidate.id))
            .then(() => {})
            .catch(() => {});
          return candidate;
        }
      } catch {
        // Hash mismatch — not this key
      }
    }
    return null;
  }

  async findAll(orgId: string) {
    return this.db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        scopes: schema.apiKeys.scopes,
        userId: schema.apiKeys.userId,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        expiresAt: schema.apiKeys.expiresAt,
        revoked: schema.apiKeys.revoked,
        createdAt: schema.apiKeys.createdAt,
      })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.revoked, false)));
  }

  async revoke(id: string, orgId: string, actorId: string, ip?: string): Promise<void> {
    const [key] = await this.db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId)))
      .limit(1);

    if (!key) throw new NotFoundException({ code: 'NOT_FOUND', message: 'API key not found' });
    if (key.revoked) throw new ForbiddenException({ code: 'ALREADY_REVOKED', message: 'API key is already revoked' });

    await this.db
      .update(schema.apiKeys)
      .set({ revoked: true })
      .where(eq(schema.apiKeys.id, id));

    await this.auditService.writeEvent({
      orgId,
      actorId,
      actorType: 'user',
      action: 'api_key.revoke',
      resourceType: 'api_key',
      resourceId: id,
      metadata: { name: key.name },
      ip,
    });
  }
}
