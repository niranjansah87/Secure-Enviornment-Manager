import { describe, it, expect } from 'vitest';
import { parseEnvPayload, diffAgainstCurrent, buildSecretsFromLines } from './bulk-diff';

describe('bulk-diff utilities', () => {
  it('parses valid .env payload while stripping comments and empty lines', () => {
    const raw = `
      # Database connection
      DB_HOST=postgres.internal
      DB_PORT=5432

      # Secrets
      API_KEY=sk_live_xyz123
      EMPTY_VAL=
    `;

    const parsed = parseEnvPayload(raw);
    expect(parsed).toEqual([
      { key: 'DB_HOST', value: 'postgres.internal' },
      { key: 'DB_PORT', value: '5432' },
      { key: 'API_KEY', value: 'sk_live_xyz123' },
      { key: 'EMPTY_VAL', value: '' },
    ]);
  });

  it('correctly calculates adds, changes, and identical secrets', () => {
    const lines = [
      { key: 'PORT', value: '3000' },        // same
      { key: 'DB_HOST', value: 'new-host' },  // change
      { key: 'NEW_KEY', value: 'fresh' },     // add
    ];

    const current = {
      PORT: '3000',
      DB_HOST: 'old-host',
    };

    const diff = diffAgainstCurrent(lines, current);
    expect(diff).toEqual([
      { key: 'DB_HOST', before: 'old-host', after: 'new-host', type: 'change' },
      { key: 'NEW_KEY', before: null, after: 'fresh', type: 'add' },
      { key: 'PORT', before: '3000', after: '3000', type: 'same' },
    ]);
  });

  it('builds secrets record map from parsed lines', () => {
    const lines = [
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
    ];
    const secrets = buildSecretsFromLines(lines);
    expect(secrets).toEqual({ A: '1', B: '2' });
  });
});

