/**
 * Auth integration tests.
 * Real PostgreSQL 16 + Redis 7 via Testcontainers.
 * Tests: login, token refresh, refresh-token reuse detection, logout.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { createTestContext, seedOrg, seedUser, type TestContext } from './helpers/app';
import * as schema from '../../src/infra/database/schema';

describe('Auth — password login', () => {
  let ctx: TestContext;
  let orgId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    const org = await seedOrg(ctx.db, 'auth-test-org');
    orgId = org.id;
    await seedUser(ctx.db, orgId, 'alice', { role: 'admin', scopes: ['secrets:read', 'secrets:write'] });
    await seedUser(ctx.db, orgId, 'inactive', { role: 'developer' }).then(async ({ user }) => {
      await ctx.db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, user.id));
    });
  }, 120000);

  afterAll(async () => {
    await ctx.stop();
  });

  it('returns access and refresh tokens on correct password', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'TestPassword123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.token_type).toBe('bearer');
  });

  it('returns 401 for wrong password', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent username', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'nobody', password: 'TestPassword123!' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for inactive user', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'inactive', password: 'TestPassword123!' });

    expect(res.status).toBe(401);
  });

  it('access token is valid ES256 JWT', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'TestPassword123!' });

    const token = res.body.data.access_token as string;
    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString());
    expect(header.alg).toBe('ES256');

    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
    expect(payload.sub).toBeDefined();
    expect(payload.org).toBeDefined();
    expect(payload.role).toBe('admin');
  });

  it('/api/v1/auth/me requires valid token', async () => {
    const noTokenRes = await ctx.agent.get('/api/v1/auth/me');
    expect(noTokenRes.status).toBe(401);

    const loginRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'alice', password: 'TestPassword123!' });

    const meRes = await ctx.agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.access_token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe('admin');
    expect(meRes.body.data.org_id).toBe(orgId);
  });
});

describe('Auth — refresh token lifecycle', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    const org = await seedOrg(ctx.db, 'refresh-test-org');
    await seedUser(ctx.db, org.id, 'bob', { role: 'developer' });
  }, 120000);

  afterAll(async () => {
    await ctx.stop();
  });

  it('rotates refresh token — old token unusable after rotation', async () => {
    const loginRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'bob', password: 'TestPassword123!' });

    const { refresh_token: firstToken } = loginRes.body.data;

    const rotateRes = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: firstToken });

    expect(rotateRes.body.success).toBe(true);
    const newToken = rotateRes.body.data.refresh_token;
    expect(newToken).not.toBe(firstToken);

    // Old token is now revoked
    const reuseRes = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: firstToken });

    expect(reuseRes.body.success).toBe(false);
  });

  it('refresh token reuse detection revokes ALL user sessions', async () => {
    // Login twice — create two sessions
    const login1 = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'bob', password: 'TestPassword123!' });
    const login2 = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'bob', password: 'TestPassword123!' });

    const token1 = login1.body.data.refresh_token;
    const token2 = login2.body.data.refresh_token;

    // Rotate token1 legitimately
    await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: token1 });

    // Reuse the REVOKED token1 — attacker scenario
    const attackRes = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: token1 });

    expect(attackRes.body.success).toBe(false);

    // After reuse detection, token2 (from the second login) must also be revoked
    const validRes = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: token2 });

    expect(validRes.body.success).toBe(false);
  });

  it('bogus refresh token is rejected cleanly', async () => {
    const res = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'semr_completelyfake_' + 'x'.repeat(40) });

    expect(res.body.success).toBe(false);
  });
});

describe('Auth — logout', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    const org = await seedOrg(ctx.db, 'logout-test-org');
    await seedUser(ctx.db, org.id, 'charlie', { role: 'developer' });
  }, 120000);

  afterAll(async () => {
    await ctx.stop();
  });

  it('logout revokes current session token', async () => {
    const loginRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'charlie', password: 'TestPassword123!' });

    const accessToken = loginRes.body.data.access_token as string;
    const refreshToken = loginRes.body.data.refresh_token as string;

    // Logout
    await ctx.agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    // Refresh token should now be invalid (session revoked)
    const refreshRes = await ctx.agent
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(refreshRes.body.success).toBe(false);
  });
});
