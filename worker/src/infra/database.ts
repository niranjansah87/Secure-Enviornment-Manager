import { Pool } from 'pg';

export function createPool(): Pool {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL must be set');
  return new Pool({ connectionString: url });
}
