import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import { KeyManagementService } from '../../infra/crypto/key-management.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../../infra/crypto/encryption.service';
import * as schema from '../../infra/database/schema';

@Injectable()
export class EnvironmentsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly kms: KeyManagementService,
    private readonly projectsService: ProjectsService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(
    projectId: string,
    orgId: string,
    name: string,
    slug: string,
    actorId: string,
    ip?: string,
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
    try {
      await this.kms.createEnvironmentDek(environment.id, projectId);
      await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'environment.create', resourceType: 'environment', resourceId: environment.id, metadata: { project_id: projectId, slug }, ip });
    } catch (error) {
      await this.db.delete(schema.environments).where(eq(schema.environments.id, environment.id));
      await this.db.delete(schema.encryptionKeys).where(eq(schema.encryptionKeys.scopeId, environment.id));
      throw error;
    }

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

  async delete(id: string, projectId: string, orgId: string, actorId: string, ip?: string): Promise<void> {
    await this.findById(id, projectId, orgId);
    await this.db.transaction(async (tx) => {
      await tx.delete(schema.environments).where(and(eq(schema.environments.id, id), eq(schema.environments.projectId, projectId)));
      await tx.delete(schema.encryptionKeys).where(eq(schema.encryptionKeys.scopeId, id));
      await this.audit.writeEvent({ orgId, actorId, actorType: 'user', action: 'environment.delete', resourceType: 'environment', resourceId: id, metadata: { project_id: projectId }, ip }, tx);
    });
  }

  async compare(sourceId: string, targetId: string, projectId: string, orgId: string) {
    await Promise.all([
      this.findById(sourceId, projectId, orgId),
      this.findById(targetId, projectId, orgId),
    ]);
    const load = async (environmentId: string) => {
      const rows = await this.db.select().from(schema.secrets).where(and(eq(schema.secrets.environmentId, environmentId), isNull(schema.secrets.deletedAt)));
      return new Map(await Promise.all(rows.map(async (secret) => [
        secret.key,
        await this.encryption.decryptSecret({ encryptedValue: secret.encryptedValue, nonce: secret.nonce, tag: secret.tag, aad: secret.aad, dekId: secret.dekId }, environmentId, secret.key, secret.id, secret.version),
      ] as const)));
    };
    const [source, target] = await Promise.all([load(sourceId), load(targetId)]);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    const unchanged: string[] = [];
    for (const [key, value] of source) {
      if (!target.has(key)) removed.push(key);
      else if (target.get(key) === value) unchanged.push(key);
      else changed.push(key);
    }
    for (const key of target.keys()) if (!source.has(key)) added.push(key);
    return { added: added.sort(), removed: removed.sort(), changed: changed.sort(), unchanged: unchanged.sort() };
  }

  toDto(e: typeof schema.environments.$inferSelect) {
    return { id: e.id, slug: e.slug, name: e.name, project_id: e.projectId, created_at: e.createdAt };
  }
}
