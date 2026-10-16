import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis> => {
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
