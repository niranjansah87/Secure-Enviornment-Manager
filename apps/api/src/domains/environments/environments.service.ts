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
import { ProjectsService } from '../projects/projects.service';
import * as schema from '../../infra/database/schema';

@Injectable()
export class EnvironmentsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly kms: KeyManagementService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(
    projectId: string,
    orgId: string,
    name: string,
    slug: string,
  ): Promise<typeof schema.environments.$inferSelect> {
    // Verifies project belongs to org
    await this.projectsService.findById(projectId, orgId);

    const existing = await this.db
      .select()
      .from(schema.environments)
      .where(and(eq(schema.environments.projectId, projectId), eq(schema.environments.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({ code: 'ALREADY_EXISTS', message: 'Environment slug already exists' });
    }

    const [environment] = await this.db
      .insert(schema.environments)
      .values({ projectId, name, slug })
      .returning();

    if (!environment) throw new Error('Failed to create environment');

    // Create DEK for the environment on creation
    await this.kms.createEnvironmentDek(environment.id, projectId);

    return environment;
  }

  async findAll(
    projectId: string,
    orgId: string,
  ): Promise<typeof schema.environments.$inferSelect[]> {
    await this.projectsService.findById(projectId, orgId);
    return this.db
      .select()
      .from(schema.environments)
      .where(eq(schema.environments.projectId, projectId));
  }

  async findById(
    id: string,
    projectId: string,
    orgId: string,
  ): Promise<typeof schema.environments.$inferSelect> {
    await this.projectsService.findById(projectId, orgId);

    const [env] = await this.db
      .select()
      .from(schema.environments)
      .where(and(eq(schema.environments.id, id), eq(schema.environments.projectId, projectId)))
      .limit(1);

    if (!env) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Environment not found' });
    return env;
  }

  async delete(id: string, projectId: string, orgId: string): Promise<void> {
    await this.findById(id, projectId, orgId);
    await this.db
      .delete(schema.environments)
      .where(and(eq(schema.environments.id, id), eq(schema.environments.projectId, projectId)));
  }

  toDto(e: typeof schema.environments.$inferSelect) {
    return { id: e.id, slug: e.slug, name: e.name, project_id: e.projectId, created_at: e.createdAt };
  }
}
