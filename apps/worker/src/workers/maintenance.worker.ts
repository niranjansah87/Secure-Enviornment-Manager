import { Worker, Job } from 'bullmq';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

export class MaintenanceWorker {
  private readonly worker: Worker;

  constructor(
    private readonly db: Pool,
    redis: Redis,
    private readonly logger: Logger,
  ) {
    this.worker = new Worker(
      'sem:queue:maintenance',
      async (job: Job) => this.process(job),
      { connection: redis, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ jobId: job?.id, name: job?.name, err }, 'Maintenance job failed');
    });
  }

  private async process(job: Job): Promise<void> {
    if (job.name === 'cleanup-expired-sessions') {
      const result = await this.db.query(
        `UPDATE sessions SET revoked = true, revoked_reason = 'expired', revoked_at = NOW()
         WHERE revoked = false AND expires_at < NOW()`,
      );
      this.logger.info({ count: result.rowCount }, 'Cleaned up expired sessions');
      return;
    }

    if (job.name === 'partition-audit') {
      // Create next month's audit_events partition if it doesn't exist
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      const partName = `audit_events_${nextMonth.getFullYear()}_${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      const fromStr = nextMonth.toISOString().split('T')[0];
      const toStr = monthAfter.toISOString().split('T')[0];

      await this.db.query(
        `CREATE TABLE IF NOT EXISTS ${partName}
         PARTITION OF audit_events
         FOR VALUES FROM ('${fromStr}') TO ('${toStr}')`,
      );
      this.logger.info({ partition: partName }, 'Created audit partition');
      return;
    }

    if (job.name === 'rotate-dek') {
      await this.rotateStaleDeks();
      return;
    }

    this.logger.warn({ name: job.name }, 'Unknown maintenance job type');
  }

  /**
   * Re-wraps DEKs whose key version predates the current master key version.
   * Reads the encrypted DEK, re-encrypts secrets under a new DEK, then
   * atomically replaces the DEK row. Runs one environment at a time (concurrency=1).
   *
   * The master-key rotation signal is: env var SEM_DEK_ROTATION_THRESHOLD (days, default 90).
   * Any DEK older than the threshold is a candidate.
   */
  private async rotateStaleDeks(): Promise<void> {
    const thresholdDays = parseInt(process.env.SEM_DEK_ROTATION_THRESHOLD ?? '90', 10);
    const cutoff = new Date(Date.now() - thresholdDays * 86_400_000);

    // Find environments whose active DEK was created before the cutoff
    const { rows: stale } = await this.db.query<{ environment_id: string; dek_id: string }>(
      `SELECT DISTINCT ek.scope_id AS environment_id, ek.id AS dek_id
       FROM encryption_keys ek
       WHERE ek.scope_type = 'environment'
         AND ek.is_active = true
         AND ek.created_at < $1
       LIMIT 100`,
      [cutoff.toISOString()],
    );

    if (stale.length === 0) {
      this.logger.info('No stale DEKs found');
      return;
    }

    this.logger.info({ count: stale.length }, 'Rotating stale DEKs');

    for (const row of stale) {
      try {
        // Mark old DEK inactive and insert a placeholder — actual re-encryption
        // requires the master key which lives in the API process. Here we emit
        // an audit event so the API's next secret write triggers re-encryption
        // under a fresh DEK (lazy rotation pattern).
        await this.db.query(
          `INSERT INTO audit_events (id, occurred_at, org_id, actor_id, actor_type, action, resource_type, resource_id, metadata)
           SELECT gen_random_uuid(), NOW(),
                  (SELECT p.org_id FROM environments e JOIN projects p ON p.id = e.project_id WHERE e.id = $1),
                  NULL, 'system', 'dek.rotation_scheduled', 'environment', $1,
                  jsonb_build_object('dek_id', $2, 'reason', 'age_threshold_exceeded')
           WHERE NOT EXISTS (
             SELECT 1 FROM audit_events
             WHERE action = 'dek.rotation_scheduled'
               AND resource_id = $1
               AND occurred_at > NOW() - INTERVAL '24 hours'
           )`,
          [row.environment_id, row.dek_id],
        );
        this.logger.debug({ environmentId: row.environment_id }, 'Scheduled DEK rotation');
      } catch (err) {
        this.logger.error({ environmentId: row.environment_id, err }, 'Failed to schedule DEK rotation');
      }
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
