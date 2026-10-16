import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../../../.env'),
];
const workspaceEnv = envCandidates.find((p) => existsSync(p));
if (workspaceEnv) process.loadEnvFile(workspaceEnv);

async function run() {
  if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL is not configured');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 1 });
  const directory = resolve(__dirname, '../infra/database/migrations');
  const files = readdirSync(directory).filter((file) => /^\d+.*\.sql$/.test(file)).sort();

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS sem_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const applied = new Set(
      (await pool.query<{ name: string }>('SELECT name FROM sem_schema_migrations')).rows.map((row) => row.name),
    );
    if (applied.size === 0) {
      const existing = await pool.query<{ present: boolean; has_hmac: boolean }>(`SELECT
        to_regclass('public.organizations') IS NOT NULL AS present,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'refresh_token_lookup_hmac'
        ) AS has_hmac`);
      if (existing.rows[0]?.present) {
        await pool.query('INSERT INTO sem_schema_migrations (name) VALUES ($1)', ['0001_initial_schema.sql']);
        applied.add('0001_initial_schema.sql');
        if (existing.rows[0].has_hmac) {
          await pool.query('INSERT INTO sem_schema_migrations (name) VALUES ($1)', ['0002_add_token_lookup_hmac.sql']);
          applied.add('0002_add_token_lookup_hmac.sql');
        }
      }
    }

    for (const file of files) {
      if (applied.has(file)) continue;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(readFileSync(resolve(directory, file), 'utf8'));
        await client.query('INSERT INTO sem_schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    console.log('Database schema is current');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});
