/**
 * Secrets integration tests.
 * Real PostgreSQL 16 + Redis 7 via Testcontainers.
 * Tests: create, read, list, update, delete, versions, tenant isolation, scope enforcement.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, seedOrg, seedUser, type TestContext } from './helpers/app';
import * as schema from '../../src/infra/database/schema';

// ─── DB seed helpers ──────────────────────────────────────────────────────────

async function seedProject(ctx: TestContext, orgId: string, slug: string) {
  const [project] = await ctx.db
    .insert(schema.projects)
    .values({ orgId, slug, name: slug })
    .returning();
  return project!;
}

async function seedEnvironment(ctx: TestContext, projectId: string, slug: string) {
  const [env] = await ctx.db
    .insert(schema.environments)
    .values({ projectId, slug, name: slug })
    .returning();
  return env!;
}

async function login(ctx: TestContext, username: string, password: string): Promise<string> {
  const res = await ctx.agent
    .post('/api/v1/auth/login')
    .send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data.access_token as string;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

let ctx: TestContext;
let orgId: string;
let projectId: string;
let environmentId: string;
let token: string;
let readOnlyToken: string;

const BASE_URL = () =>
  `/api/v1/projects/${projectId}/environments/${environmentId}/secrets`;

beforeAll(async () => {
  ctx = await createTestContext();

  const org = await seedOrg(ctx.db, 'secrets-test-org');
  orgId = org.id;

  const project = await seedProject(ctx, orgId, 'main-project');
  projectId = project.id;

  const env = await seedEnvironment(ctx, projectId, 'production');
  environmentId = env.id;

  const { password: pw } = await seedUser(ctx.db, orgId, 'secrets-writer', {
    role: 'developer',
    scopes: ['secrets:read', 'secrets:write'],
  });
  token = await login(ctx, 'secrets-writer', pw);

  const { password: roPw } = await seedUser(ctx.db, orgId, 'secrets-reader', {
    role: 'developer',
    scopes: ['secrets:read'],
  });
  readOnlyToken = await login(ctx, 'secrets-reader', roPw);
}, 120_000);

afterAll(async () => {
  await ctx.stop();
});

// ─── List (empty) ─────────────────────────────────────────────────────────────

describe('GET /secrets (list)', () => {
  it('returns empty list for fresh environment', async () => {
    const res = await ctx.agent
      .get(BASE_URL())
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 401 without token', async () => {
    const res = await ctx.agent.get(BASE_URL());
    expect(res.status).toBe(401);
  });
});

// ─── Create (upsert) ─────────────────────────────────────────────────────────

describe('PUT /secrets/:key (upsert)', () => {
  it('creates a secret and returns metadata without plaintext value', async () => {
    const res = await ctx.agent
      .put(`${BASE_URL()}/DATABASE_URL`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'postgres://user:pass@host/db', description: 'primary DB' });

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('DATABASE_URL');
    expect(res.body.data.description).toBe('primary DB');
    // plaintext value must not be in the list response
    expect(res.body.data.value).toBeUndefined();
  });

  it('returns 403 for secrets:read-only user', async () => {
    const res = await ctx.agent
      .put(`${BASE_URL()}/SECRET_KEY`)
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ value: 'should-fail' });

    expect(res.status).toBe(403);
  });

  it('rejects empty value', async () => {
    const res = await ctx.agent
      .put(`${BASE_URL()}/EMPTY_KEY`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: '' });

    expect(res.status).toBe(400);
  });
});

// ─── Read value ───────────────────────────────────────────────────────────────

describe('GET /secrets/:key/value', () => {
  it('returns decrypted value for existing secret', async () => {
    const res = await ctx.agent
      .get(`${BASE_URL()}/DATABASE_URL/value`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('DATABASE_URL');
    expect(res.body.data.value).toBe('postgres://user:pass@host/db');
  });

  it('returns 404 for unknown key', async () => {
    const res = await ctx.agent
      .get(`${BASE_URL()}/NONEXISTENT/value`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── List (populated) ────────────────────────────────────────────────────────

describe('GET /secrets (after writes)', () => {
  it('lists created secrets without values', async () => {
    const res = await ctx.agent
      .get(BASE_URL())
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const keys = res.body.data.map((s: { key: string }) => s.key);
    expect(keys).toContain('DATABASE_URL');
    // confirm no secret exposes its plaintext value in list
    for (const item of res.body.data) {
      expect(item.value).toBeUndefined();
    }
  });
});

// ─── Update (increments version) ─────────────────────────────────────────────

describe('PUT /secrets/:key (update)', () => {
  it('updates existing secret and increments version', async () => {
    const first = await ctx.agent
      .get(`${BASE_URL()}/DATABASE_URL/value`)
      .set('Authorization', `Bearer ${token}`);
    const v1 = first.body.data.version as number;

    await ctx.agent
      .put(`${BASE_URL()}/DATABASE_URL`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'postgres://user:newpass@host/db' });

    const res = await ctx.agent
      .get(`${BASE_URL()}/DATABASE_URL/value`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.value).toBe('postgres://user:newpass@host/db');
    expect(res.body.data.version).toBe(v1 + 1);
  });
});

// ─── Version history ─────────────────────────────────────────────────────────

describe('GET /secrets/:key/versions', () => {
  it('returns version list with at least 2 versions after update', async () => {
    const res = await ctx.agent
      .get(`${BASE_URL()}/DATABASE_URL/versions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // version list items must not expose plaintext values
    for (const v of res.body.data) {
      expect(v.value).toBeUndefined();
    }
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('DELETE /secrets/:key', () => {
  it('deletes a secret so subsequent reads return 404', async () => {
    await ctx.agent
      .put(`${BASE_URL()}/TO_DELETE`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'bye' });

    const del = await ctx.agent
      .delete(`${BASE_URL()}/TO_DELETE`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const get = await ctx.agent
      .get(`${BASE_URL()}/TO_DELETE/value`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

// ─── Tenant isolation ────────────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it("cannot read another org's environment secrets with a valid token from a different org", async () => {
    const otherOrg = await seedOrg(ctx.db, 'other-org-secrets');
    const otherProject = await seedProject(ctx, otherOrg.id, 'other-project');
    const otherEnv = await seedEnvironment(ctx, otherProject.id, 'staging');

    const { password } = await seedUser(ctx.db, otherOrg.id, 'other-user-secrets', {
      role: 'developer',
      scopes: ['secrets:read', 'secrets:write'],
    });
    const otherToken = await login(ctx, 'other-user-secrets', password);

    // Write a secret in the other org
    await ctx.agent
      .put(`/api/v1/projects/${otherProject.id}/environments/${otherEnv.id}/secrets/OTHER_SECRET`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ value: 'other-secret-value' });

    // Try to access other org's environment using the first org's token — must fail
    const res = await ctx.agent
      .get(`/api/v1/projects/${otherProject.id}/environments/${otherEnv.id}/secrets`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── Bulk replace ─────────────────────────────────────────────────────────────

describe('POST /secrets/bulk', () => {
  it('replaces all secrets atomically', async () => {
    const res = await ctx.agent
      .post(`${BASE_URL()}/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        secrets: [
          { key: 'BULK_A', value: 'value-a' },
          { key: 'BULK_B', value: 'value-b' },
        ],
      });

    expect(res.status).toBe(200);

    const list = await ctx.agent
      .get(BASE_URL())
      .set('Authorization', `Bearer ${token}`);

    const keys = list.body.data.map((s: { key: string }) => s.key);
    expect(keys).toContain('BULK_A');
    expect(keys).toContain('BULK_B');
  });
});
