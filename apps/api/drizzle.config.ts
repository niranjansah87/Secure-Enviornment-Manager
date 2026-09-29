import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local', override: true });

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL not set');

export default defineConfig({
  schema: './src/infra/database/schema.ts',
  out: './src/infra/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
