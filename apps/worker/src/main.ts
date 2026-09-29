/**
 * SEM V2 Worker Process
 * Handles background jobs: email, maintenance, audit aggregation.
 * Runs as a separate process from the API server.
 */
import 'reflect-metadata';
import pino from 'pino';
import { createPool } from './infra/database';
import { createRedis } from './infra/redis';
import { EmailWorker } from './workers/email.worker';
import { MaintenanceWorker } from './workers/maintenance.worker';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

async function main() {
  logger.info('SEM Worker starting');

  const db = createPool();
  const redis = createRedis();

  const emailWorker = new EmailWorker(redis, logger);
  const maintenanceWorker = new MaintenanceWorker(db, redis, logger);

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM — gracefully closing workers');
    await emailWorker.close();
    await maintenanceWorker.close();
    await redis.quit();
    await db.end();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT — gracefully closing workers');
    await emailWorker.close();
    await maintenanceWorker.close();
    await redis.quit();
    await db.end();
    process.exit(0);
  });

  logger.info('Workers running');
}

main().catch((err) => {
  logger.error(err, 'Fatal worker error');
  process.exit(1);
});
