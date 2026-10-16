import {
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_TOKEN } from '../../infra/database/database.module';
import { EncryptionService } from '../../infra/crypto/encryption.service';
import { EnvironmentsService } from '../environments/environments.service';
import { AuditService } from '../audit/audit.service';
import * as schema from '../../infra/database/schema';
import { SecretsGateway } from '../../infra/websocket/secrets.gateway';
import { SnapshotsService } from '../snapshots/snapshots.service';

export interface UpsertSecretInput {
  key: string;
  value: string;
  description?: string;
  isSensitive?: boolean;
}

@Injectable()
export class SecretsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly encryption: EncryptionService,
    private readonly environmentsService: EnvironmentsService,
    private readonly auditService: AuditService,
    private readonly gateway: SecretsGateway,
    private readonly snapshots: SnapshotsService,
  ) {}

  async upsert(
    environmentId: string,
    projectId: string,
    orgId: string,
    input: UpsertSecretInput,
    actorId: string,
    ip?: string,
  ) {
    // Validates tenant boundary — throws 404 if env doesn't belong to org
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const result = await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(schema.secrets)
        .where(
          and(
            eq(schema.secrets.environmentId, environmentId),
            eq(schema.secrets.key, input.key),
          ),
        )
        .limit(1);

      let secret: typeof schema.secrets.$inferSelect;
      let changeType: 'create' | 'update' | 'restore';

      if (existing.length > 0 && existing[0]) {
        const prev = existing[0];
        changeType = prev.deletedAt ? 'restore' : 'update';
        const nextVersion = prev.version + 1;

        const encrypted = await this.encryption.encryptSecret(
          input.value,
          environmentId,
          input.key,
          prev.id,
          nextVersion,
        );

        // Write immutable version snapshot
        await tx.insert(schema.secretVersions).values({
          secretId: prev.id,
          version: nextVersion,
          encryptedValue: encrypted.encryptedValue,
          nonce: encrypted.nonce,
          tag: encrypted.tag,
          aad: encrypted.aad,
          dekId: encrypted.dekId,
          changeType,
          changedBy: actorId,
        });

        const [updated] = await tx
          .update(schema.secrets)
          .set({
            encryptedValue: encrypted.encryptedValue,
            nonce: encrypted.nonce,
            tag: encrypted.tag,
            aad: encrypted.aad,
            dekId: encrypted.dekId,
            description: input.description ?? prev.description,
            isSensitive: input.isSensitive ?? prev.isSensitive,
            version: nextVersion,
            updatedBy: actorId,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(eq(schema.secrets.id, prev.id))
          .returning();

        if (!updated) throw new Error('Failed to update secret');
        secret = updated;
      } else {
        changeType = 'create';
        // Generate UUID ahead of time so it can be bound in AAD
        const newId = randomUUID();

        const encrypted = await this.encryption.encryptSecret(
          input.value,
          environmentId,
          input.key,
          newId,
          1,
        );

        const [created] = await tx
          .insert(schema.secrets)
          .values({
            id: newId,
            environmentId,
            key: input.key,
            encryptedValue: encrypted.encryptedValue,
            nonce: encrypted.nonce,
            tag: encrypted.tag,
            aad: encrypted.aad,
            dekId: encrypted.dekId,
            description: input.description,
            isSensitive: input.isSensitive ?? false,
            version: 1,
            createdBy: actorId,
            updatedBy: actorId,
          })
          .returning();

        if (!created) throw new Error('Failed to create secret');
        secret = created;

        // First version entry
        await tx.insert(schema.secretVersions).values({
          secretId: secret.id,
          version: 1,
          encryptedValue: encrypted.encryptedValue,
          nonce: encrypted.nonce,
          tag: encrypted.tag,
          aad: encrypted.aad,
          dekId: encrypted.dekId,
          changeType: 'create',
          changedBy: actorId,
        });
      }

      // Audit write in same transaction — guarantees consistency
      await this.auditService.writeEvent(
        {
          orgId,
          actorId,
          actorType: 'user',
          action: `secret.${changeType}`,
          resourceType: 'secret',
          resourceId: secret.id,
          // Never include secret value in audit metadata
          metadata: {
            key: input.key,
            environment_id: environmentId,
            version: String(secret.version),
          },
          ip,
        },
        tx,
      );

      return secret;
    });
    this.gateway.emitToEnvironment(environmentId, result.version === 1 ? 'secret:created' : 'secret:updated', { key: result.key, version: result.version });
    const snapshotAction = result.version === 1 ? 'secret.create' : 'secret.update';
    await this.snapshots.capture(environmentId, projectId, orgId, actorId, snapshotAction, `${snapshotAction} ${input.key}`);
    return result;
  }

  async findAll(environmentId: string, projectId: string, orgId: string) {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    return this.db
      .select({
        id: schema.secrets.id,
        key: schema.secrets.key,
        description: schema.secrets.description,
        isSensitive: schema.secrets.isSensitive,
        version: schema.secrets.version,
        createdAt: schema.secrets.createdAt,
        updatedAt: schema.secrets.updatedAt,
      })
      .from(schema.secrets)
      .where(and(eq(schema.secrets.environmentId, environmentId), isNull(schema.secrets.deletedAt)))
      .orderBy(schema.secrets.key);
  }

  async findByKey(
    environmentId: string,
    projectId: string,
    orgId: string,
    key: string,
    actorId: string,
    ip?: string,
  ): Promise<string> {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const [secret] = await this.db
      .select()
      .from(schema.secrets)
      .where(
        and(
          eq(schema.secrets.environmentId, environmentId),
          eq(schema.secrets.key, key),
          isNull(schema.secrets.deletedAt),
        ),
      )
      .limit(1);

    if (!secret) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Secret not found' });

    const plaintext = await this.encryption.decryptSecret(
      {
        encryptedValue: secret.encryptedValue,
        nonce: secret.nonce,
        tag: secret.tag,
        aad: secret.aad,
        dekId: secret.dekId,
      },
      environmentId,
      key,
      secret.id,
      secret.version,
    );

    await this.auditService.writeEvent({
      orgId,
      actorId,
      actorType: 'user',
      action: 'secret.read',
      resourceType: 'secret',
      resourceId: secret.id,
      metadata: { key, environment_id: environmentId },
      ip,
    });

    return plaintext;
  }

  async delete(
    environmentId: string,
    projectId: string,
    orgId: string,
    key: string,
    actorId: string,
    ip?: string,
  ): Promise<void> {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const [secret] = await this.db
      .select()
      .from(schema.secrets)
      .where(
        and(
          eq(schema.secrets.environmentId, environmentId),
          eq(schema.secrets.key, key),
          isNull(schema.secrets.deletedAt),
        ),
      )
      .limit(1);

    if (!secret) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Secret not found' });

    const plaintext = await this.encryption.decryptSecret(
      {
        encryptedValue: secret.encryptedValue,
        nonce: secret.nonce,
        tag: secret.tag,
        aad: secret.aad,
        dekId: secret.dekId,
      },
      environmentId,
      key,
      secret.id,
      secret.version,
    );
    const nextVersion = secret.version + 1;
    const encrypted = await this.encryption.encryptSecret(plaintext, environmentId, key, secret.id, nextVersion);

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.secretVersions).values({
        secretId: secret.id,
        version: nextVersion,
        encryptedValue: encrypted.encryptedValue,
        nonce: encrypted.nonce,
        tag: encrypted.tag,
        aad: encrypted.aad,
        dekId: encrypted.dekId,
        changeType: 'delete',
        changedBy: actorId,
      });

      await tx
        .update(schema.secrets)
        .set({
          encryptedValue: encrypted.encryptedValue,
          nonce: encrypted.nonce,
          tag: encrypted.tag,
          aad: encrypted.aad,
          dekId: encrypted.dekId,
          version: nextVersion,
          updatedBy: actorId,
          updatedAt: new Date(),
          deletedAt: new Date(),
        })
        .where(and(eq(schema.secrets.id, secret.id), eq(schema.secrets.environmentId, environmentId)));

      await this.auditService.writeEvent(
        {
          orgId,
          actorId,
          actorType: 'user',
          action: 'secret.delete',
          resourceType: 'secret',
          resourceId: secret.id,
          metadata: { key, environment_id: environmentId },
          ip,
        },
        tx,
      );
    });
    this.gateway.emitToEnvironment(environmentId, 'secret:deleted', { key, version: nextVersion });
    await this.snapshots.capture(environmentId, projectId, orgId, actorId, 'secret.delete', `delete ${key}`);
  }

  async export(
    environmentId: string,
    projectId: string,
    orgId: string,
    format: 'env' | 'json' | 'yaml' | 'docker',
    actorId: string,
    ip?: string,
  ): Promise<string> {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const secrets = await this.db
      .select()
      .from(schema.secrets)
      .where(and(eq(schema.secrets.environmentId, environmentId), isNull(schema.secrets.deletedAt)))
      .orderBy(schema.secrets.key);

    // Decrypt all in parallel — each call gets fresh DEK decryption
    const pairs = await Promise.all(
      secrets.map(async (s) => ({
        key: s.key,
        value: await this.encryption.decryptSecret(
          {
            encryptedValue: s.encryptedValue,
            nonce: s.nonce,
            tag: s.tag,
            aad: s.aad,
            dekId: s.dekId,
          },
          environmentId,
          s.key,
          s.id,
          s.version,
        ),
      })),
    );

    await this.auditService.writeEvent({
      orgId,
      actorId,
      actorType: 'user',
      action: 'secret.export',
      resourceType: 'environment',
      resourceId: environmentId,
      metadata: { format, count: String(pairs.length) },
      ip,
    });

    switch (format) {
      case 'json':
        return JSON.stringify(
          Object.fromEntries(pairs.map((p) => [p.key, p.value])),
          null,
          2,
        );
      case 'docker':
        return pairs.map((p) => `--env ${p.key}=${p.value}`).join(' ');
      case 'yaml':
        return pairs.map((p) => `${p.key}: ${JSON.stringify(p.value)}`).join('\n');
      case 'env':
      default:
        return pairs.map((p) => `${p.key}=${p.value}`).join('\n');
    }
  }

  async listVersions(
    environmentId: string,
    projectId: string,
    orgId: string,
    key: string,
  ) {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const [secret] = await this.db
      .select({ id: schema.secrets.id })
      .from(schema.secrets)
      .where(
        and(
          eq(schema.secrets.environmentId, environmentId),
          eq(schema.secrets.key, key),
        ),
      )
      .limit(1);

    if (!secret) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Secret not found' });

    return this.db
      .select({
        id: schema.secretVersions.id,
        version: schema.secretVersions.version,
        changeType: schema.secretVersions.changeType,
        changedBy: schema.secretVersions.changedBy,
        createdAt: schema.secretVersions.createdAt,
      })
      .from(schema.secretVersions)
      .where(eq(schema.secretVersions.secretId, secret.id))
      .orderBy(desc(schema.secretVersions.version));
  }

  async rollback(
    environmentId: string,
    projectId: string,
    orgId: string,
    key: string,
    targetVersion: number,
    actorId: string,
    ip?: string,
  ) {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const [secret] = await this.db
      .select()
      .from(schema.secrets)
      .where(
        and(
          eq(schema.secrets.environmentId, environmentId),
          eq(schema.secrets.key, key),
        ),
      )
      .limit(1);

    if (!secret) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Secret not found' });

    const [versionRow] = await this.db
      .select()
      .from(schema.secretVersions)
      .where(
        and(
          eq(schema.secretVersions.secretId, secret.id),
          eq(schema.secretVersions.version, targetVersion),
        ),
      )
      .limit(1);

    if (!versionRow) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Version not found' });
    }

    if (versionRow.changeType === 'delete') {
      throw new ForbiddenException({ code: 'INVALID_VERSION', message: 'Cannot rollback to a deletion version' });
    }

    const result = await this.db.transaction(async (tx) => {
      const nextVersion = secret.version + 1;

      // Re-encrypt the historical ciphertext under the current DEK
      // (first decrypt the old value, then encrypt with new version params)
      const plaintext = await this.encryption.decryptSecret(
        {
          encryptedValue: versionRow.encryptedValue,
          nonce: versionRow.nonce,
          tag: versionRow.tag,
          aad: versionRow.aad,
          dekId: versionRow.dekId,
        },
        environmentId,
        key,
        secret.id,
        versionRow.version,
      );

      const reEncrypted = await this.encryption.encryptSecret(
        plaintext,
        environmentId,
        key,
        secret.id,
        nextVersion,
      );

      await tx.insert(schema.secretVersions).values({
        secretId: secret.id,
        version: nextVersion,
        encryptedValue: reEncrypted.encryptedValue,
        nonce: reEncrypted.nonce,
        tag: reEncrypted.tag,
        aad: reEncrypted.aad,
        dekId: reEncrypted.dekId,
        changeType: 'restore',
        changedBy: actorId,
      });

      const [updated] = await tx
        .update(schema.secrets)
        .set({
          encryptedValue: reEncrypted.encryptedValue,
          nonce: reEncrypted.nonce,
          tag: reEncrypted.tag,
          aad: reEncrypted.aad,
          dekId: reEncrypted.dekId,
          version: nextVersion,
          updatedBy: actorId,
          updatedAt: new Date(),
          deletedAt: null,
        })
        .where(eq(schema.secrets.id, secret.id))
        .returning();

      await this.auditService.writeEvent(
        {
          orgId,
          actorId,
          actorType: 'user',
          action: 'secret.rollback',
          resourceType: 'secret',
          resourceId: secret.id,
          metadata: {
            key,
            environment_id: environmentId,
            from_version: String(secret.version),
            to_version: String(targetVersion),
          },
          ip,
        },
        tx,
      );

      return updated;
    });
    this.gateway.emitToEnvironment(environmentId, 'secret:updated', { key, version: result?.version ?? 0 });
    await this.snapshots.capture(environmentId, projectId, orgId, actorId, 'secret.rollback', `rollback ${key} to version ${targetVersion}`);
    return result;
  }

  async bulkReplace(
    environmentId: string,
    projectId: string,
    orgId: string,
    secrets: Array<{ key: string; value: string; description?: string; is_sensitive?: boolean }>,
    actorId: string,
    ip?: string,
    replaceMissing = false,
  ) {
    await this.environmentsService.findById(environmentId, projectId, orgId);

    const results = await this.db.transaction(async (tx) => {
      const results: typeof schema.secrets.$inferSelect[] = [];

      for (const input of secrets) {
        const [existing] = await tx
          .select()
          .from(schema.secrets)
          .where(
            and(
              eq(schema.secrets.environmentId, environmentId),
              eq(schema.secrets.key, input.key),
            ),
          )
          .limit(1);

        if (existing) {
          const nextVersion = existing.version + 1;
          const enc = await this.encryption.encryptSecret(
            input.value,
            environmentId,
            input.key,
            existing.id,
            nextVersion,
          );

          await tx.insert(schema.secretVersions).values({
            secretId: existing.id,
            version: nextVersion,
            encryptedValue: enc.encryptedValue,
            nonce: enc.nonce,
            tag: enc.tag,
            aad: enc.aad,
            dekId: enc.dekId,
            changeType: existing.deletedAt ? 'restore' : 'update',
            changedBy: actorId,
          });

          const [updated] = await tx
            .update(schema.secrets)
            .set({
              encryptedValue: enc.encryptedValue,
              nonce: enc.nonce,
              tag: enc.tag,
              aad: enc.aad,
              dekId: enc.dekId,
              description: input.description ?? existing.description,
              isSensitive: input.is_sensitive ?? existing.isSensitive,
              version: nextVersion,
              updatedBy: actorId,
              updatedAt: new Date(),
              deletedAt: null,
            })
            .where(eq(schema.secrets.id, existing.id))
            .returning();
          if (updated) results.push(updated);
        } else {
          const newId = randomUUID();
          const enc = await this.encryption.encryptSecret(input.value, environmentId, input.key, newId, 1);

          const [created] = await tx
            .insert(schema.secrets)
            .values({
              id: newId,
              environmentId,
              key: input.key,
              encryptedValue: enc.encryptedValue,
              nonce: enc.nonce,
              tag: enc.tag,
              aad: enc.aad,
              dekId: enc.dekId,
              description: input.description,
              isSensitive: input.is_sensitive ?? false,
              version: 1,
              createdBy: actorId,
              updatedBy: actorId,
            })
            .returning();
          if (!created) throw new Error(`Failed to create secret: ${input.key}`);
          results.push(created);

          await tx.insert(schema.secretVersions).values({
            secretId: created.id,
            version: 1,
            encryptedValue: enc.encryptedValue,
            nonce: enc.nonce,
            tag: enc.tag,
            aad: enc.aad,
            dekId: enc.dekId,
            changeType: 'create',
            changedBy: actorId,
          });
        }
      }

      if (replaceMissing) {
        const requested = new Set(secrets.map((item) => item.key));
        const active = await tx.select().from(schema.secrets).where(and(eq(schema.secrets.environmentId, environmentId), isNull(schema.secrets.deletedAt)));
        for (const current of active) {
          if (requested.has(current.key)) continue;
          const plaintext = await this.encryption.decryptSecret({ encryptedValue: current.encryptedValue, nonce: current.nonce, tag: current.tag, aad: current.aad, dekId: current.dekId }, environmentId, current.key, current.id, current.version);
          const nextVersion = current.version + 1;
          const encrypted = await this.encryption.encryptSecret(plaintext, environmentId, current.key, current.id, nextVersion);
          await tx.insert(schema.secretVersions).values({ secretId: current.id, version: nextVersion, encryptedValue: encrypted.encryptedValue, nonce: encrypted.nonce, tag: encrypted.tag, aad: encrypted.aad, dekId: encrypted.dekId, changeType: 'delete', changedBy: actorId });
          await tx.update(schema.secrets).set({ encryptedValue: encrypted.encryptedValue, nonce: encrypted.nonce, tag: encrypted.tag, aad: encrypted.aad, dekId: encrypted.dekId, version: nextVersion, deletedAt: new Date(), updatedAt: new Date(), updatedBy: actorId }).where(eq(schema.secrets.id, current.id));
        }
      }

      await this.auditService.writeEvent(
        {
          orgId,
          actorId,
          actorType: 'user',
          action: 'secret.bulk_replace',
          resourceType: 'environment',
          resourceId: environmentId,
          metadata: { count: String(secrets.length), environment_id: environmentId },
          ip,
        },
        tx,
      );

      return results;
    });
    this.gateway.emitToEnvironment(environmentId, 'secret:bulk_updated', { count: results.length });
    await this.snapshots.capture(environmentId, projectId, orgId, actorId, 'secret.bulk_update', `bulk update ${results.length} secrets`);
    return results;
  }
}
