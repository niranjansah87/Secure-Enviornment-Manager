/**
 * KeyManagementService — manages the encryption key hierarchy.
 *
 * Hierarchy:
 *   Master Key (env var) → Project KEK → Environment DEK → Secret values
 *
 * DEKs are decrypted on-demand and never cached in Redis or stored in plaintext.
 */
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  wrapKey,
  unwrapKey,
  generateAesKey,
  buildKeyAad,
  EnvMasterKeyProvider,
  type MasterKeyProvider,
  type EncryptedBlob,
} from '@sem/crypto';
import { DB_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  private masterKeyProvider!: MasterKeyProvider;

  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    // Validate master key exists at startup — fail fast
    const keyValue = this.config.get<string>('app.masterKey.value');
    const keyFile = this.config.get<string>('app.masterKey.file');

    if (keyFile) {
      const fs = require('fs') as typeof import('fs');
      process.env['SEM_MASTER_KEY'] = fs.readFileSync(keyFile, 'utf8').trim();
    } else if (keyValue) {
      process.env['SEM_MASTER_KEY'] = keyValue;
    }

    this.masterKeyProvider = new EnvMasterKeyProvider('SEM_MASTER_KEY');
    this.logger.log('Master key provider initialized');
  }

  /** Get the active DEK for an environment, decrypting it from storage. */
  async getDek(dekId: string): Promise<Buffer> {
    const [row] = await this.db
      .select()
      .from(schema.encryptionKeys)
      .where(eq(schema.encryptionKeys.id, dekId))
      .limit(1);

    if (!row) throw new Error(`Encryption key ${dekId} not found`);

    const masterKey = await this.masterKeyProvider.getMasterKey();
    try {
      if (row.scopeType === 'environment') {
        // DEK encrypted by project KEK
        const [kekRow] = await this.db
          .select()
          .from(schema.encryptionKeys)
          .where(
            and(
              eq(schema.encryptionKeys.scopeId, await this.getProjectIdForDek(row)),
              eq(schema.encryptionKeys.isActive, true),
              eq(schema.encryptionKeys.scopeType, 'project'),
            ),
          )
          .limit(1);

        if (!kekRow) throw new Error('Project KEK not found for DEK');

        const kekBlob: EncryptedBlob = {
          ciphertext: kekRow.encryptedKey as Buffer,
          nonce: kekRow.nonce as Buffer,
          tag: kekRow.tag as Buffer,
          aad: kekRow.aad as Buffer,
        };
        const kek = unwrapKey(kekBlob, masterKey);

        try {
          const dekBlob: EncryptedBlob = {
            ciphertext: row.encryptedKey as Buffer,
            nonce: row.nonce as Buffer,
            tag: row.tag as Buffer,
            aad: row.aad as Buffer,
          };
          return unwrapKey(dekBlob, kek);
        } finally {
          kek.fill(0);
        }
      } else {
        // KEK directly encrypted by master key
        const blob: EncryptedBlob = {
          ciphertext: row.encryptedKey as Buffer,
          nonce: row.nonce as Buffer,
          tag: row.tag as Buffer,
          aad: row.aad as Buffer,
        };
        return unwrapKey(blob, masterKey);
      }
    } finally {
      masterKey.fill(0);
    }
  }

  /** Create a new KEK for a project, wrapped by the master key. */
  async createProjectKek(projectId: string): Promise<string> {
    const masterKey = await this.masterKeyProvider.getMasterKey();
    try {
      const kek = generateAesKey();
      try {
        const aad = buildKeyAad({ scopeType: 'project', scopeId: projectId, keyVersion: 1 });
        const wrapped = wrapKey(kek, masterKey, aad);

        const [row] = await this.db
          .insert(schema.encryptionKeys)
          .values({
            scopeType: 'project',
            scopeId: projectId,
            keyVersion: 1,
            encryptedKey: wrapped.ciphertext,
            nonce: wrapped.nonce,
            tag: wrapped.tag,
            aad: wrapped.aad,
            isActive: true,
          })
          .returning({ id: schema.encryptionKeys.id });

        if (!row) throw new Error('Failed to insert project KEK');
        return row.id;
      } finally {
        kek.fill(0);
      }
    } finally {
      masterKey.fill(0);
    }
  }

  /** Create a new DEK for an environment, wrapped by the project KEK. */
  async createEnvironmentDek(environmentId: string, projectId: string): Promise<string> {
    const kekId = await this.getActiveKekIdForProject(projectId);
    const kek = await this.getDek(kekId);

    try {
      const dek = generateAesKey();
      try {
        const aad = buildKeyAad({ scopeType: 'environment', scopeId: environmentId, keyVersion: 1 });
        const wrapped = wrapKey(dek, kek, aad);

        const [row] = await this.db
          .insert(schema.encryptionKeys)
          .values({
            scopeType: 'environment',
            scopeId: environmentId,
            keyVersion: 1,
            encryptedKey: wrapped.ciphertext,
            nonce: wrapped.nonce,
            tag: wrapped.tag,
            aad: wrapped.aad,
            isActive: true,
          })
          .returning({ id: schema.encryptionKeys.id });

        if (!row) throw new Error('Failed to insert environment DEK');
        return row.id;
      } finally {
        dek.fill(0);
      }
    } finally {
      kek.fill(0);
    }
  }

  /** Get the active DEK ID for an environment. */
  async getActiveDekId(environmentId: string): Promise<string> {
    const [row] = await this.db
      .select({ id: schema.encryptionKeys.id })
      .from(schema.encryptionKeys)
      .where(
        and(
          eq(schema.encryptionKeys.scopeId, environmentId),
          eq(schema.encryptionKeys.isActive, true),
          eq(schema.encryptionKeys.scopeType, 'environment'),
        ),
      )
      .limit(1);

    if (!row) throw new Error(`No active DEK for environment ${environmentId}`);
    return row.id;
  }

  private async getActiveKekIdForProject(projectId: string): Promise<string> {
    const [row] = await this.db
      .select({ id: schema.encryptionKeys.id })
      .from(schema.encryptionKeys)
      .where(
        and(
          eq(schema.encryptionKeys.scopeId, projectId),
          eq(schema.encryptionKeys.isActive, true),
          eq(schema.encryptionKeys.scopeType, 'project'),
        ),
      )
      .limit(1);

    if (!row) throw new Error(`No active KEK for project ${projectId}`);
    return row.id;
  }

  private async getProjectIdForDek(dekRow: typeof schema.encryptionKeys.$inferSelect): Promise<string> {
    // DEK scope_id is the environment_id; look up the project
    const [env] = await this.db
      .select({ projectId: schema.environments.projectId })
      .from(schema.environments)
      .where(eq(schema.environments.id, dekRow.scopeId))
      .limit(1);

    if (!env) throw new Error(`Environment ${dekRow.scopeId} not found`);
    return env.projectId;
  }
}
