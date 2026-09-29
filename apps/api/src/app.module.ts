import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { CryptoModule } from './infra/crypto/crypto.module';
import { QueueModule } from './infra/queue/queue.module';
import { WebSocketModule } from './infra/websocket/websocket.module';
import { ObservabilityModule } from './infra/observability/observability.module';
import { AuthModule } from './domains/auth/auth.module';
import { OrganizationsModule } from './domains/organizations/organizations.module';
import { UsersModule } from './domains/users/users.module';
import { ProjectsModule } from './domains/projects/projects.module';
import { EnvironmentsModule } from './domains/environments/environments.module';
import { SecretsModule } from './domains/secrets/secrets.module';
import { ApiKeysModule } from './domains/api-keys/api-keys.module';
import { AuditModule } from './domains/audit/audit.module';
import { HistoryModule } from './domains/history/history.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { HealthModule } from './domains/health/health.module';
import { RemoteConfigModule } from './domains/remote-config/remote-config.module';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 300,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    CryptoModule,
    QueueModule,
    WebSocketModule,
    ObservabilityModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    EnvironmentsModule,
    SecretsModule,
    ApiKeysModule,
    AuditModule,
    HistoryModule,
    AnalyticsModule,
    HealthModule,
    RemoteConfigModule,
  ],
})
export class AppModule {}
