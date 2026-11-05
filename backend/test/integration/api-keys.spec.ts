/**
 * API Keys integration tests.
 * Real PostgreSQL 16 + Redis 7 via Testcontainers.
 * Tests: create (rawKey returned once), authenticate, scope enforcement, revoke, cross-tenant IDOR.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, seedOrg, seedUser, type TestContext } from './helpers/app';

let ctx: TestContext;
let orgId: string;
let adminToken: string;
let devToken: string;

beforeAll(async () => {
  ctx = await createTestContext();

  const org = await seedOrg(ctx.db, 'apikeys-test-org');
  orgId = org.id;

  const { password: adminPw } = await seedUser(ctx.db, orgId, 'apikeys-admin', {
    role: 'admin',
    scopes: ['secrets:read', 'secrets:write', 'api_keys:manage'],
  });
  const adminRes = await ctx.agent
    .post('/api/v1/auth/login')
    .send({ username: 'apikeys-admin', password: adminPw });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.body.data.access_token;

  const { password: devPw } = await seedUser(ctx.db, orgId, 'apikeys-dev', {
    role: 'developer',
    scopes: ['secrets:read'],
  });
  const devRes = await ctx.agent
    .post('/api/v1/auth/login')
    .send({ username: 'apikeys-dev', password: devPw });
  expect(devRes.status).toBe(200);
  devToken = devRes.body.data.access_token;
}, 120_000);

afterAll(async () => {
  await ctx.stop();
});

// ─── Create ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/api-keys (create)', () => {
  it('returns rawKey in response with sem_ prefix', async () => {
    const res = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ci-key', scopes: ['secrets:read'] });

    expect(res.status).toBe(201);
    expect(res.body.data.key).toMatch(/^sem_/);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('ci-key');
  });

  it('does not expose rawKey or hash on list', async () => {
    const list = await ctx.agent
      .get('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    for (const k of list.body.data) {
      expect(k.key).toBeUndefined();
      expect(k.keyHash).toBeUndefined();
    }
  });

  it('rejects unknown scopes', async () => {
    const res = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'bad-scope-key', scopes: ['nonexistent:scope'] });

    expect(res.status).toBe(403);
  });

  it('forbids a developer from granting scopes they do not have', async () => {
    const res = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ name: 'escalation-attempt', scopes: ['secrets:write'] });

    expect(res.status).toBe(403);
  });
});

// ─── Authenticate with API key ────────────────────────────────────────────────

describe('POST /api/v1/auth/login (API key)', () => {
  let rawKey: string;

  beforeAll(async () => {
    const res = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'auth-test-key', scopes: ['secrets:read'] });
    rawKey = res.body.data.key as string;
  });

  it('exchanges API key for JWT with correct scopes', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ api_key: rawKey });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();

    const payload = JSON.parse(
      Buffer.from(res.body.data.access_token.split('.')[1]!, 'base64url').toString(),
    );
    expect(payload.scopes).toContain('secrets:read');
    expect(payload.scopes).not.toContain('secrets:write');
  });

  it('rejects a tampered / invalid API key', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ api_key: 'sem_fakeid_fakesecret' });

    expect(res.status).toBe(401);
  });
});

// ─── Revoke ───────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/api-keys/:id (revoke)', () => {
  it('revoked key cannot authenticate', async () => {
    const create = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'revocable-key', scopes: ['secrets:read'] });
    const { id, key: rawKey } = create.body.data as { id: string; key: string };

    const del = await ctx.agent
      .delete(`/api/v1/api-keys/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const loginRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ api_key: rawKey });
    expect(loginRes.status).toBe(401);
  });
});

// ─── Cross-tenant IDOR ────────────────────────────────────────────────────────

describe('Cross-tenant IDOR', () => {
  it("cannot delete another org's API key", async () => {
    const otherOrg = await seedOrg(ctx.db, 'other-org-apikeys');

    const { password } = await seedUser(ctx.db, otherOrg.id, 'other-admin-apikeys', {
      role: 'admin',
      scopes: ['secrets:read', 'api_keys:manage'],
    });
    const otherRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'other-admin-apikeys', password });
    const otherToken = otherRes.body.data.access_token as string;

    const create = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'other-orgs-key', scopes: ['secrets:read'] });
    const otherId = create.body.data.id as string;

    // Attacker from first org tries to delete other org's key
    const res = await ctx.agent
      .delete(`/api/v1/api-keys/${otherId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("cannot create API key bound to a user in another org", async () => {
    const otherOrg = await seedOrg(ctx.db, 'other-org-apikeys-2');

    const { user: otherUser } = await seedUser(ctx.db, otherOrg.id, 'cross-tenant-victim', {
      role: 'developer',
      scopes: ['secrets:read'],
    });

    const res = await ctx.agent
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'cross-tenant-key', scopes: ['secrets:read'], user_id: otherUser.id });

    expect(res.status).toBe(403);
  });
});
