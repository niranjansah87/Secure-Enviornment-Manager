import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import { KeyManagementService } from '../../infra/crypto/key-management.service';
import { AuditService } from '../audit/audit.service';
import * as schema from '../../infra/database/schema';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly kms: KeyManagementService,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, name: string, slug: string, actorId: string, ip?: string): Promise<typeof schema.projects.$inferSelect> {
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
    try {
      await this.kms.createProjectKek(project.id);
      await this.audit.writeEvent({
        orgId,
        actorId,
        actorType: 'user',
        action: 'project.create',
        resourceType: 'project',
        resourceId: project.id,
        metadata: { slug },
        ip,
      });
    } catch (error) {
      await this.db.delete(schema.projects).where(eq(schema.projects.id, project.id));
      await this.db.delete(schema.encryptionKeys).where(eq(schema.encryptionKeys.scopeId, project.id));
      throw error;
    }

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

  async delete(id: string, orgId: string, actorId: string, ip?: string): Promise<void> {
    await this.findById(id, orgId);
    const envs = await this.db.select({ id: schema.environments.id }).from(schema.environments).where(eq(schema.environments.projectId, id));
    await this.db.transaction(async (tx) => {
      await tx.delete(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.orgId, orgId)));
      if (envs.length > 0) {
        await tx.delete(schema.encryptionKeys).where(inArray(schema.encryptionKeys.scopeId, envs.map((env) => env.id)));
      }
      await tx.delete(schema.encryptionKeys).where(eq(schema.encryptionKeys.scopeId, id));
      await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'project.delete', resourceType: 'project', resourceId: id, metadata: {}, ip }, tx);
    });
  }

  toDto(p: typeof schema.projects.$inferSelect) {
    return { id: p.id, slug: p.slug, name: p.name, org_id: p.orgId, created_at: p.createdAt };
  }
}
