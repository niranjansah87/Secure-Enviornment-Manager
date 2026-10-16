import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { AUDIT_QUEUE, EMAIL_QUEUE, MAINTENANCE_QUEUE, QUEUE_NAMES } from './queue.constants';
import { REDIS_CLIENT } from '../redis/redis.module';
export { AUDIT_QUEUE, EMAIL_QUEUE, MAINTENANCE_QUEUE, QUEUE_NAMES } from './queue.constants';

class FallbackQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add() {
    return null;
  }
  async upsertJobScheduler() {
    return null;
  }
  async close() {
    return;
  }
  on() {
    return this;
  }
}

function makeQueue(name: string, config: ConfigService, redis: Redis): Queue {
  if (redis.status !== 'ready') {
    return new FallbackQueue(name) as unknown as Queue;
  }
  try {
    const redisUrl = config.get<string>('app.redis.url', 'redis://localhost:6379');
    const password = config.get<string | undefined>('app.redis.password');
    const q = new Queue(name, {
      connection: {
        url: redisUrl,
        password,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100, age: 86400 },
        removeOnFail: { count: 500, age: 604800 },
      },
    });
    q.on('error', () => {});
    return q;
  } catch {
    return new FallbackQueue(name) as unknown as Queue;
  }
}

@Global()
@Module({
  providers: [
    MaintenanceScheduler,
    {
      provide: EMAIL_QUEUE,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => makeQueue(QUEUE_NAMES.EMAIL, config, redis),
    },
    {
      provide: AUDIT_QUEUE,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => makeQueue(QUEUE_NAMES.AUDIT, config, redis),
    },
    {
      provide: MAINTENANCE_QUEUE,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => makeQueue(QUEUE_NAMES.MAINTENANCE, config, redis),
    },
  ],
  exports: [EMAIL_QUEUE, AUDIT_QUEUE, MAINTENANCE_QUEUE],
})
export class QueueModule {}
