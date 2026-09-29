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
          retryStrategy: (times) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
          lazyConnect: false,
          keyPrefix: '', // we prefix keys explicitly in each service
        });

        client.on('error', (err) => {
          // Log but do not throw — Redis failures should degrade gracefully
          console.error('[Redis] Connection error', err.message);
        });

        await client.ping(); // verify connection on module init
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
