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

    this.logger.warn({ name: job.name }, 'Unknown maintenance job type');
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
