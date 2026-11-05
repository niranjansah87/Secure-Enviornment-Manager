import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_TOKEN = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('app.database.url');
        if (!url) throw new Error('DATABASE_URL is not configured');

        const pool = new Pool({
          connectionString: url,
          min: config.get<number>('app.database.poolMin', 2),
          max: config.get<number>('app.database.poolMax', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        return drizzle(pool, { schema, logger: process.env['DB_LOGGING'] === 'true' });
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DatabaseModule {}
