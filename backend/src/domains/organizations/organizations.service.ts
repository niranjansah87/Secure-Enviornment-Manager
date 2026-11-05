import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import * as schema from '../../infra/database/schema';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>) {}

  async create(name: string, slug: string): Promise<typeof schema.organizations.$inferSelect> {
    const existing = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({ code: 'ALREADY_EXISTS', message: 'Organization slug already taken' });
    }

    const [org] = await this.db
      .insert(schema.organizations)
      .values({ name, slug })
      .returning();

    if (!org) throw new Error('Failed to create organization');
    return org;
  }

  async findById(id: string): Promise<typeof schema.organizations.$inferSelect> {
    const [org] = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, id))
      .limit(1);

    if (!org) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Organization not found' });
    return org;
  }

  async findBySlug(slug: string): Promise<typeof schema.organizations.$inferSelect | null> {
    const [org] = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, slug))
      .limit(1);
    return org ?? null;
  }

  async ensureExists(orgId: string): Promise<void> {
    await this.findById(orgId); // throws if not found
  }
}
