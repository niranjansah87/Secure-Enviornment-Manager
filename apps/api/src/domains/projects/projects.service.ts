import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import { KeyManagementService } from '../../infra/crypto/key-management.service';
import * as schema from '../../infra/database/schema';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly kms: KeyManagementService,
  ) {}

  async create(orgId: string, name: string, slug: string): Promise<typeof schema.projects.$inferSelect> {
    const existing = await this.db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.orgId, orgId), eq(schema.projects.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({ code: 'ALREADY_EXISTS', message: 'Project slug already exists' });
    }

    const [project] = await this.db.insert(schema.projects).values({ orgId, name, slug }).returning();
    if (!project) throw new Error('Failed to create project');

    // Create KEK for the project
    await this.kms.createProjectKek(project.id);

    return project;
  }

  async findAll(orgId: string): Promise<typeof schema.projects.$inferSelect[]> {
    return this.db.select().from(schema.projects).where(eq(schema.projects.orgId, orgId));
  }

  async findById(id: string, orgId: string): Promise<typeof schema.projects.$inferSelect> {
    const [project] = await this.db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.orgId, orgId)))
      .limit(1);

    if (!project) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    return project;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.findById(id, orgId);
    await this.db.delete(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.orgId, orgId)));
  }

  toDto(p: typeof schema.projects.$inferSelect) {
    return { id: p.id, slug: p.slug, name: p.name, org_id: p.orgId, created_at: p.createdAt };
  }
}
