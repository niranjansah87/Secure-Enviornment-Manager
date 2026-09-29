import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { SecretsGateway } from './secrets.gateway';

export const SOCKET_SERVER = Symbol('SOCKET_SERVER');

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

        const pubClient = new Redis(redisUrl, { password });
        const subClient = pubClient.duplicate();

        const io = new Server({
          cors: {
            origin: allowedOrigins,
            credentials: true,
          },
          transports: ['websocket', 'polling'],
        });

        io.adapter(createAdapter(pubClient, subClient));
        return io;
      },
    },
  ],
  exports: [SecretsGateway, SOCKET_SERVER],
})
export class WebSocketModule {}
