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
import type { UserRole } from '@sem/types';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>) {}

  async create(params: {
    orgId: string;
    username: string;
    email?: string;
    role?: UserRole;
    scopes?: string[];
    createdBy?: string;
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
  ): Promise<typeof schema.users.$inferSelect> {
    await this.findById(id, orgId); // ensure exists and belongs to org

    const [updated] = await this.db
      .update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)))
      .returning();

    if (!updated) throw new Error('Failed to update user');
    return updated;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.findById(id, orgId);
    await this.db
      .delete(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)));
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
