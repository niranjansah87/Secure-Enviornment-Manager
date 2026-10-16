import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { SecretsGateway } from './secrets.gateway';
import { SOCKET_SERVER } from './websocket.constants';

export { SOCKET_SERVER } from './websocket.constants';

@Global()
@Module({
  providers: [
    SecretsGateway,
    {
      provide: SOCKET_SERVER,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('app.redis.url', 'redis://localhost:6379');
        const password = config.get<string | undefined>('app.redis.password');
        const allowedOrigins = config.get<string[]>('app.cors.origins', ['http://localhost:3000']);

        const io = new Server({
          cors: {
            origin: allowedOrigins,
            credentials: true,
          },
          transports: ['websocket', 'polling'],
        });

        try {
          const pubClient = new Redis(redisUrl, {
            password,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
          });
          pubClient.on('error', () => {});
          await pubClient.connect();
          const subClient = pubClient.duplicate();
          subClient.on('error', () => {});
          await subClient.connect();
          io.adapter(createAdapter(pubClient, subClient));
        } catch {
          // Fall back to in-memory Socket.io adapter when Redis is offline
        }

        return io;
      },
    },
  ],
  exports: [SecretsGateway, SOCKET_SERVER],
})
export class WebSocketModule {}
