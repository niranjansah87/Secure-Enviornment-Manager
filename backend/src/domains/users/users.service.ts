import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { generateToken } from '@sem/crypto';
import { Queue } from 'bullmq';
import type { UserRole } from '@sem/types';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';
import { AuditService } from '../audit/audit.service';
import { EMAIL_QUEUE } from '../../infra/queue/queue.module';

const ARGON2_OPTIONS: argon2.HashOptions & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
    private readonly audit: AuditService,
  ) {}

  async create(params: {
    orgId: string;
    username: string;
    email?: string;
    role?: UserRole;
    scopes?: string[];
    createdBy?: string;
    ip?: string;
  }): Promise<{ user: typeof schema.users.$inferSelect; tempPassword: string }> {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.orgId, params.orgId), eq(schema.users.username, params.username)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({ code: 'ALREADY_EXISTS', message: 'Username already taken in this organization' });
    }

    const tempPassword = generateToken(16); // 22-char random password
    const passwordHash = await argon2.hash(tempPassword, ARGON2_OPTIONS);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        orgId: params.orgId,
        username: params.username,
        email: params.email,
        passwordHash,
        role: params.role ?? 'developer',
        scopes: params.scopes ?? ['secrets:read', 'secrets:write', 'secrets:export', 'history:read', 'api-keys:manage'],
        mustChangePassword: true,
        createdBy: params.createdBy,
      })
      .returning();

    if (!user) throw new Error('Failed to create user');
    await this.audit.writeEvent({ orgId: params.orgId, actorId: params.createdBy ?? null, actorType: 'user', action: 'user.create', resourceType: 'user', resourceId: user.id, metadata: { username: user.username, role: user.role }, ip: params.ip });
    if (user.email) {
      void this.emailQueue.add('send-welcome', { to: user.email, username: user.username }).catch(() => undefined);
    }
    return { user, tempPassword };
  }

  async findById(id: string, orgId: string): Promise<typeof schema.users.$inferSelect> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)))
      .limit(1);

    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }

  async findAllInOrg(orgId: string): Promise<typeof schema.users.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.orgId, orgId));
  }

  async update(
    id: string,
    orgId: string,
    updates: {
      email?: string;
      role?: UserRole;
      scopes?: string[];
      isActive?: boolean;
    },
    actorId: string,
    ip?: string,
  ): Promise<typeof schema.users.$inferSelect> {
    const existing = await this.findById(id, orgId);
    if (existing.role === 'admin' && existing.isActive && (updates.role !== undefined && updates.role !== 'admin' || updates.isActive === false)) {
      await this.ensureAnotherAdmin(id, orgId);
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.users)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)))
        .returning();

      if (!updated) throw new Error('Failed to update user');
      if (updates.role !== undefined || updates.scopes !== undefined || updates.isActive !== undefined) {
        await tx
          .update(schema.sessions)
          .set({ revoked: true, revokedAt: new Date(), revokedReason: 'permissions_changed' })
          .where(and(eq(schema.sessions.userId, id), eq(schema.sessions.revoked, false)));
      }
      await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'user.update', resourceType: 'user', resourceId: id, metadata: { role: updated.role, active: String(updated.isActive) }, ip }, tx);
      return updated;
    });
  }

  async delete(id: string, orgId: string, actorId: string, ip?: string): Promise<void> {
    const existing = await this.findById(id, orgId);
    if (existing.role === 'admin' && existing.isActive) await this.ensureAnotherAdmin(id, orgId);
    await this.db
      .delete(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)));
    await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'user.delete', resourceType: 'user', resourceId: id, metadata: { username: existing.username }, ip });
  }

  async resetPassword(id: string, orgId: string, actorId: string, ip?: string): Promise<string> {
    await this.findById(id, orgId);
    const temporaryPassword = generateToken(16);
    const passwordHash = await argon2.hash(temporaryPassword, ARGON2_OPTIONS);
    await this.db.transaction(async (tx) => {
      await tx.update(schema.users).set({ passwordHash, mustChangePassword: true, updatedAt: new Date() }).where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)));
      await tx.update(schema.sessions).set({ revoked: true, revokedAt: new Date(), revokedReason: 'admin_password_reset' }).where(and(eq(schema.sessions.userId, id), eq(schema.sessions.revoked, false)));
      await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'user.password_reset', resourceType: 'user', resourceId: id, metadata: {}, ip }, tx);
    });
    return temporaryPassword;
  }

  private async ensureAnotherAdmin(id: string, orgId: string): Promise<void> {
    const admins = await this.db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, 'admin'), eq(schema.users.isActive, true)));
    if (!admins.some((admin) => admin.id !== id)) {
      throw new ConflictException({ code: 'LAST_ADMIN', message: 'The organization must retain an active administrator' });
    }
  }

  toDto(user: typeof schema.users.$inferSelect) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scopes: user.scopes,
      is_active: user.isActive,
      must_change_password: user.mustChangePassword,
      created_at: user.createdAt,
    };
  }
}
