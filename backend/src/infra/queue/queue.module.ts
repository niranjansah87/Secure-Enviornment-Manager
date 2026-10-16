import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { AUDIT_QUEUE, EMAIL_QUEUE, MAINTENANCE_QUEUE, QUEUE_NAMES } from './queue.constants';
export { AUDIT_QUEUE, EMAIL_QUEUE, MAINTENANCE_QUEUE, QUEUE_NAMES } from './queue.constants';

function makeQueue(name: string, config: ConfigService): Queue {
  const redisUrl = config.get<string>('app.redis.url', 'redis://localhost:6379');
  const password = config.get<string | undefined>('app.redis.password');
  return new Queue(name, {
    connection: { url: redisUrl, password },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100, age: 86400 },
      removeOnFail: { count: 500, age: 604800 },
    },
  });
}

@Global()
@Module({
  providers: [
    MaintenanceScheduler,
    {
      provide: EMAIL_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => makeQueue(QUEUE_NAMES.EMAIL, config),
    },
    {
      provide: AUDIT_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => makeQueue(QUEUE_NAMES.AUDIT, config),
    },
    {
      provide: MAINTENANCE_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => makeQueue(QUEUE_NAMES.MAINTENANCE, config),
    },
  ],
  exports: [EMAIL_QUEUE, AUDIT_QUEUE, MAINTENANCE_QUEUE],
})
export class QueueModule {}
