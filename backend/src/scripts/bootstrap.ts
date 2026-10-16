import { existsSync } from 'fs';
import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

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
  try {
    const passwordHash = await argon2.hash(randomBytes(48), { type: argon2.argon2id });
    await pool.query('BEGIN');
    const org = await pool.query<{ id: string }>(
      `INSERT INTO organizations (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [process.env['SEM_DEFAULT_ORG_SLUG'] ?? 'default', process.env['SEM_DEFAULT_ORG_NAME'] ?? 'Default'],
    );
    await pool.query(
      `INSERT INTO users (org_id, username, password_hash, role, scopes, is_active)
       VALUES ($1, 'master', $2, 'admin', ARRAY['*']::TEXT[], true)
       ON CONFLICT (org_id, username) DO UPDATE
       SET role = 'admin', scopes = ARRAY['*']::TEXT[], is_active = true, updated_at = NOW()`,
      [org.rows[0]!.id, passwordHash],
    );
    await pool.query('COMMIT');
    console.log('Default organization and master identity are ready');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap failed');
  process.exitCode = 1;
});
