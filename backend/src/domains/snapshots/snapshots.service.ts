import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { DB_TOKEN } from '../../infra/database/database.module';
import { EncryptionService } from '../../infra/crypto/encryption.service';
import { EnvironmentsService } from '../environments/environments.service';
import * as schema from '../../infra/database/schema';

@Injectable()
export class SnapshotsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly encryption: EncryptionService,
    private readonly environments: EnvironmentsService,
  ) {}

  async capture(environmentId: string, projectId: string, orgId: string, actorId: string, action: string, description: string) {
    await this.environments.findById(environmentId, projectId, orgId);
    const rows = await this.db.select().from(schema.secrets).where(and(eq(schema.secrets.environmentId, environmentId), isNull(schema.secrets.deletedAt)));
    const variables = Object.fromEntries(await Promise.all(rows.map(async (secret) => [
      secret.key,
      await this.encryption.decryptSecret({ encryptedValue: secret.encryptedValue, nonce: secret.nonce, tag: secret.tag, aad: secret.aad, dekId: secret.dekId }, environmentId, secret.key, secret.id, secret.version),
    ])));
    const id = randomUUID();
    const encrypted = await this.encryption.encryptSnapshot(variables, environmentId, id);
    const [snapshot] = await this.db.insert(schema.environmentSnapshots).values({
      id,
      environmentId,
      encryptedVariables: encrypted.encryptedValue,
      nonce: encrypted.nonce,
      tag: encrypted.tag,
      aad: encrypted.aad,
      dekId: encrypted.dekId,
      action,
      description,
      actorId,
    }).returning();
    return snapshot;
  }

  async list(environmentId: string, projectId: string, orgId: string) {
    await this.environments.findById(environmentId, projectId, orgId);
    return this.db.select({
      id: schema.environmentSnapshots.id,
      action: schema.environmentSnapshots.action,
      description: schema.environmentSnapshots.description,
      actorId: schema.environmentSnapshots.actorId,
      createdAt: schema.environmentSnapshots.createdAt,
    }).from(schema.environmentSnapshots).where(eq(schema.environmentSnapshots.environmentId, environmentId)).orderBy(desc(schema.environmentSnapshots.createdAt)).limit(100);
  }

  async get(environmentId: string, projectId: string, orgId: string, snapshotId: string) {
    await this.environments.findById(environmentId, projectId, orgId);
    const [snapshot] = await this.db.select().from(schema.environmentSnapshots).where(and(eq(schema.environmentSnapshots.id, snapshotId), eq(schema.environmentSnapshots.environmentId, environmentId))).limit(1);
    if (!snapshot) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Snapshot not found' });
    const variables = await this.encryption.decryptSnapshot({ encryptedValue: snapshot.encryptedVariables, nonce: snapshot.nonce, tag: snapshot.tag, aad: snapshot.aad, dekId: snapshot.dekId }, environmentId, snapshot.id);
    return { snapshot, variables };
  }
}
