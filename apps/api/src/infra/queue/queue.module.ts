import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const QUEUE_NAMES = {
  EMAIL: 'sem:queue:email',
  AUDIT: 'sem:queue:audit',
  MAINTENANCE: 'sem:queue:maintenance',
} as const;

export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');
export const AUDIT_QUEUE = Symbol('AUDIT_QUEUE');
export const MAINTENANCE_QUEUE = Symbol('MAINTENANCE_QUEUE');

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
