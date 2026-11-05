import { Controller, Get, Header, Inject, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { DB_TOKEN } from '../../infra/database/database.module';
import { REDIS_CLIENT } from '../../infra/redis/redis.module';
import * as schema from '../../infra/database/schema';
import { MetricsService } from '../../infra/observability/metrics.service';
import { renderHomePage } from './home.template';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller()
export class HealthController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/html; charset=utf-8')
  home() {
    const isRedisEnabled = this.config.get<boolean>('app.redis.enabled', false);
    const port = this.config.get<number>('PORT', 3001);
    const env = this.config.get<string>('NODE_ENV', 'development');
    return renderHomePage({
      uptime: process.uptime(),
      nodeVersion: process.version,
      port,
      env,
      isRedisEnabled,
    });
  }

  @Get('healthz')
  @Public()
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('readyz')
  @Public()
  async readiness() {
    const checks: Record<string, 'ok' | 'fail' | 'disabled'> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'fail';
    }

    const isRedisEnabled = this.config.get<boolean>('app.redis.enabled', false);
    if (isRedisEnabled) {
      try {
        await this.redis.ping();
        checks['redis'] = 'ok';
      } catch {
        checks['redis'] = 'fail';
      }
    } else {
      checks['redis'] = 'disabled';
    }

    const criticalChecks = ['database'];
    if (isRedisEnabled) criticalChecks.push('redis');
    const healthy = criticalChecks.every((k) => checks[k] === 'ok');
    const result = {
      status: healthy ? 'ok' : 'degraded',
      checks,
      uptime: process.uptime(),
    };
    if (!healthy) throw new ServiceUnavailableException(result);
    return result;
  }

  @Get('metrics')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metricsReport() {
    return this.metrics.registry.metrics();
  }
}
