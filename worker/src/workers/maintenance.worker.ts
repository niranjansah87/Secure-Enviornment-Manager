import { Worker, Job } from 'bullmq';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import {
  buildKeyAad,
  buildSecretAad,
  decryptValue,
  encryptValue,
  generateAesKey,
  unwrapKey,
  wrapKey,
} from '@sem/crypto';

export class MaintenanceWorker {
  private readonly worker: Worker;

  constructor(private readonly db: Pool, redis: Redis, private readonly logger: Logger) {
    this.worker = new Worker('sem-queue-maintenance', async (job: Job) => this.process(job), {
      connection: redis,
      concurrency: 1,
    });
    this.worker.on('failed', (job, err) => this.logger.error({ jobId: job?.id, name: job?.name, err }, 'Maintenance job failed'));
  }

  private async process(job: Job): Promise<void> {
    if (job.name === 'cleanup-expired-sessions') {
      const result = await this.db.query(`UPDATE sessions SET revoked = true, revoked_reason = 'expired', revoked_at = NOW()
        WHERE revoked = false AND expires_at < NOW()`);
      this.logger.info({ count: result.rowCount }, 'Cleaned up expired sessions');
      return;
    }
    if (job.name === 'partition-audit') {
      const now = new Date();
      const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const monthAfter = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
      const partName = `audit_events_${nextMonth.getUTCFullYear()}_${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
      await this.db.query(`CREATE TABLE IF NOT EXISTS ${partName} PARTITION OF audit_events FOR VALUES FROM ($1) TO ($2)`, [nextMonth, monthAfter]);
      this.logger.info({ partition: partName }, 'Created audit partition');
      return;
    }
    if (job.name === 'rotate-dek') {
      await this.rotateStaleDeks();
      return;
    }
    this.logger.warn({ name: job.name }, 'Unknown maintenance job type');
  }

  private async rotateStaleDeks(): Promise<void> {
    const thresholdDays = parseInt(process.env['SEM_DEK_ROTATION_DAYS'] ?? '90', 10);
    const masterKeyValue = process.env['SEM_MASTER_KEY'];
    if (!masterKeyValue) throw new Error('SEM_MASTER_KEY is required for DEK rotation');
    const masterKey = Buffer.from(masterKeyValue, 'base64');
    if (masterKey.length !== 32) throw new Error('SEM_MASTER_KEY must decode to 32 bytes');
    const stale = await this.db.query<{ environment_id: string; dek_id: string }>(
      `SELECT scope_id AS environment_id, id AS dek_id FROM encryption_keys
       WHERE scope_type = 'environment' AND is_active = true AND created_at < NOW() - ($1 * INTERVAL '1 day') LIMIT 100`,
      [thresholdDays],
    );

    try {
      for (const row of stale.rows) await this.rotateEnvironmentDek(row.environment_id, row.dek_id, masterKey);
    } finally {
      masterKey.fill(0);
    }
  }

  private async rotateEnvironmentDek(environmentId: string, oldDekId: string, masterKey: Buffer): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{
        org_id: string; key_version: number; encrypted_key: Buffer; nonce: Buffer; tag: Buffer; aad: Buffer;
        kek_encrypted_key: Buffer; kek_nonce: Buffer; kek_tag: Buffer; kek_aad: Buffer;
      }>(`SELECT p.org_id, dek.key_version, dek.encrypted_key, dek.nonce, dek.tag, dek.aad,
                 kek.encrypted_key AS kek_encrypted_key, kek.nonce AS kek_nonce, kek.tag AS kek_tag, kek.aad AS kek_aad
          FROM environments e JOIN projects p ON p.id = e.project_id
          JOIN encryption_keys dek ON dek.id = $2 AND dek.scope_id = e.id AND dek.is_active = true
          JOIN encryption_keys kek ON kek.scope_id = p.id AND kek.scope_type = 'project' AND kek.is_active = true
          WHERE e.id = $1 FOR UPDATE OF dek`, [environmentId, oldDekId]);
      const current = result.rows[0];
      if (!current) {
        await client.query('ROLLBACK');
        return;
      }
      const kek = unwrapKey({ ciphertext: current.kek_encrypted_key, nonce: current.kek_nonce, tag: current.kek_tag, aad: current.kek_aad }, masterKey);
      const oldDek = unwrapKey({ ciphertext: current.encrypted_key, nonce: current.nonce, tag: current.tag, aad: current.aad }, kek);
      const newDek = generateAesKey();
      try {
        const nextKeyVersion = current.key_version + 1;
        const wrapped = wrapKey(newDek, kek, buildKeyAad({ scopeType: 'environment', scopeId: environmentId, keyVersion: nextKeyVersion }));
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO encryption_keys (scope_type, scope_id, key_version, encrypted_key, nonce, tag, aad, is_active)
           VALUES ('environment', $1, $2, $3, $4, $5, $6, true) RETURNING id`,
          [environmentId, nextKeyVersion, wrapped.ciphertext, wrapped.nonce, wrapped.tag, wrapped.aad],
        );
        const newDekId = inserted.rows[0]!.id;
        const secrets = await client.query<{ id: string; key: string; version: number; encrypted_value: Buffer; nonce: Buffer; tag: Buffer }>(
          'SELECT id, key, version, encrypted_value, nonce, tag FROM secrets WHERE environment_id = $1 AND dek_id = $2',
          [environmentId, oldDekId],
        );
        for (const secret of secrets.rows) {
          const oldAad = buildSecretAad({ secretId: secret.id, environmentId, key: secret.key, version: secret.version, dekVersion: current.key_version });
          const plaintext = decryptValue({ ciphertext: secret.encrypted_value, key: oldDek, nonce: secret.nonce, tag: secret.tag, aad: oldAad });
          const aad = buildSecretAad({ secretId: secret.id, environmentId, key: secret.key, version: secret.version, dekVersion: nextKeyVersion });
          const encrypted = encryptValue({ plaintext, key: newDek, aad });
          await client.query('UPDATE secrets SET encrypted_value=$1, nonce=$2, tag=$3, aad=$4, dek_id=$5 WHERE id=$6', [encrypted.ciphertext, encrypted.nonce, encrypted.tag, encrypted.aad, newDekId, secret.id]);
        }
        await client.query('UPDATE encryption_keys SET is_active=false, rotated_at=NOW() WHERE id=$1', [oldDekId]);
        await client.query(`INSERT INTO audit_events (org_id, actor_id, actor_type, action, resource_type, resource_id, metadata)
          VALUES ($1, NULL, 'system', 'dek.rotated', 'environment', $2, jsonb_build_object('from_dek_id',$3,'to_dek_id',$4,'secret_count',$5))`,
          [current.org_id, environmentId, oldDekId, newDekId, secrets.rowCount ?? 0]);
        await client.query('COMMIT');
        this.logger.info({ environmentId, count: secrets.rowCount }, 'DEK rotated');
      } finally {
        kek.fill(0);
        oldDek.fill(0);
        newDek.fill(0);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ environmentId, error }, 'Failed to rotate DEK');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
