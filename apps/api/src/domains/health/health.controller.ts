import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { Public } from '../../common/decorators/public.decorator';
import { DB_TOKEN } from '../../infra/database/database.module';
import { REDIS_CLIENT } from '../../infra/redis/redis.module';
import * as schema from '../../infra/database/schema';

@Controller()
export class HealthController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  @Get('healthz')
  @Public()
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('readyz')
  @Public()
  async readiness() {
    const checks: Record<string, 'ok' | 'fail'> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'fail';
    }

    try {
      await this.redis.ping();
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'fail';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      uptime: process.uptime(),
    };
  }
}
