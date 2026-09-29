/**
 * EncryptionService — the only service that handles plaintext secret values.
 *
 * Security invariants:
 * - Plaintext values are never logged
 * - DEKs are decrypted in memory only for the duration of one operation
 * - AAD binds every ciphertext to its exact resource location (secretId:envId:key:version:dekVersion)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  encryptValue,
  decryptValue,
  buildSecretAad,
  serializeBlob,
} from '@sem/crypto';
import { DB_TOKEN } from '../database/database.module';
import { KeyManagementService } from './key-management.service';
import * as schema from '../database/schema';

export interface EncryptedSecret {
  encryptedValue: Buffer;
  nonce: Buffer;
  tag: Buffer;
  aad: Buffer;
  dekId: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    private readonly kms: KeyManagementService,
  ) {}

  /**
   * Encrypt a secret value for storage.
   * Looks up the active DEK for the environment internally.
   * Caller must provide secretId (generate UUID before calling) and version.
   */
  async encryptSecret(
    plaintext: string,
    environmentId: string,
    key: string,
    secretId: string,
    version: number,
  ): Promise<EncryptedSecret> {
    const dekId = await this.kms.getActiveDekId(environmentId);
    const dekVersion = await this.getDekVersion(dekId);

    const dek = await this.kms.getDek(dekId);
    try {
      const aad = buildSecretAad({ secretId, environmentId, key, version, dekVersion });
      const blob = encryptValue({ plaintext, key: dek, aad });
      const serialized = serializeBlob(blob);
      return { ...serialized, dekId };
    } finally {
      dek.fill(0);
    }
  }

  /**
   * Decrypt a stored secret value.
   * Requires the stored metadata to reconstruct AAD exactly.
   */
  async decryptSecret(
    encrypted: EncryptedSecret,
    environmentId: string,
    key: string,
    secretId: string,
    version: number,
  ): Promise<string> {
    const dekVersion = await this.getDekVersion(encrypted.dekId);
    const dek = await this.kms.getDek(encrypted.dekId);
    try {
      const aad = buildSecretAad({ secretId, environmentId, key, version, dekVersion });
      return decryptValue({
        ciphertext: encrypted.encryptedValue,
        key: dek,
        nonce: encrypted.nonce,
        tag: encrypted.tag,
        aad,
      });
    } catch (err) {
      this.logger.error(
        `Decryption failed for secret ${secretId} v${version}: ${(err as Error).message}`,
      );
      throw new Error('Secret decryption failed — possible data corruption or key mismatch');
    } finally {
      dek.fill(0);
    }
  }

  private async getDekVersion(dekId: string): Promise<number> {
    const [row] = await this.db
      .select({ keyVersion: schema.encryptionKeys.keyVersion })
      .from(schema.encryptionKeys)
      .where(eq(schema.encryptionKeys.id, dekId))
      .limit(1);
    if (!row) throw new Error(`Encryption key ${dekId} not found`);
    return row.keyVersion;
  }
}
