import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

class DisabledRedis {
  readonly status = 'disabled';
  async ping(): Promise<string> {
    throw new Error('Redis is disabled');
  }
  async get(): Promise<string | null> {
    return null;
  }
  async set(): Promise<'OK'> {
    return 'OK';
  }
  async del(): Promise<number> {
    return 1;
  }
  async incr(): Promise<number> {
    throw new Error('Redis is disabled');
  }
  async expire(): Promise<number> {
    return 1;
  }
  async quit(): Promise<'OK'> {
    return 'OK';
  }
  async disconnect(): Promise<void> {
    return;
  }
  on(): this {
    return this;
  }
  removeListener(): this {
    return this;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis> => {
        const isEnabled = config.get<boolean>('app.redis.enabled', false);
        if (!isEnabled) {
          return new DisabledRedis() as unknown as Redis;
        }

        const url = config.get<string>('app.redis.url', 'redis://localhost:6379');
        const password = config.get<string | undefined>('app.redis.password');

        const client = new Redis(url, {
          password,
          retryStrategy: () => null,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          keyPrefix: '',
        });

        client.on('error', () => {
          // Degrade gracefully
        });

        try {
          await client.connect();
          await client.ping();
        } catch {
          console.warn('[Redis] Connection not established; running in standalone mode');
        }
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
