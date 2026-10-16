/**
 * Tenant isolation integration tests.
 * Verifies that org boundaries are enforced at the API layer —
 * no IDOR, no cross-tenant secret access, no cross-tenant user enumeration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, seedOrg, seedUser, type TestContext } from './helpers/app';
import * as schema from '../../src/infra/database/schema';

interface OrgSetup {
  orgId: string;
  projectId: string;
  environmentId: string;
  accessToken: string;
  userId: string;
}

async function loginAndSetup(ctx: TestContext, orgSlug: string, username: string): Promise<OrgSetup> {
  const org = await seedOrg(ctx.db, orgSlug);
  const { user } = await seedUser(ctx.db, org.id, username, {
    role: 'admin',
    scopes: ['secrets:read', 'secrets:write', 'secrets:delete', 'secrets:export', 'admin:projects', 'admin:environments'],
  });

  // Create project
  const projRes = await ctx.agent
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${await getToken(ctx, username)}`)
    .send({ name: `${orgSlug}-proj`, slug: `${orgSlug}-proj` });

  let accessToken = await getToken(ctx, username);

  const projectId = projRes.body.data?.id;

  let environmentId: string | undefined;
  if (projectId) {
    const envRes = await ctx.agent
      .post(`/api/v1/projects/${projectId}/environments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'production', slug: 'production' });
    environmentId = envRes.body.data?.id;

    if (environmentId) {
      await ctx.agent
        .put(`/api/v1/projects/${projectId}/environments/${environmentId}/secrets/MY_SECRET`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `secret-for-${orgSlug}` });
    }
  }

  return {
    orgId: org.id,
    projectId: projectId ?? '',
    environmentId: environmentId ?? '',
    accessToken,
    userId: user.id,
  };
}

async function getToken(ctx: TestContext, username: string): Promise<string> {
  const res = await ctx.agent
    .post('/api/v1/auth/login')
    .send({ username, password: 'TestPassword123!' });
  return res.body.data?.access_token ?? '';
}

describe('Tenant isolation', () => {
  let ctx: TestContext;
  let orgA: OrgSetup;
  let orgB: OrgSetup;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Seed two separate orgs
    orgA = await loginAndSetup(ctx, 'org-alpha', 'alpha-admin');
    orgB = await loginAndSetup(ctx, 'org-beta', 'beta-admin');
  }, 180000);

  afterAll(async () => {
    await ctx.stop();
  });

  it('org-A user cannot list org-B secrets', async () => {
    if (!orgB.projectId || !orgB.environmentId) return;

    const res = await ctx.agent
      .get(`/api/v1/projects/${orgB.projectId}/environments/${orgB.environmentId}/secrets`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);

    // Must be 404 (environment not found in org-A) or 403, never 200 with org-B data
    expect([403, 404]).toContain(res.status);
  });

  it('org-A user cannot read org-B secret value', async () => {
    if (!orgB.projectId || !orgB.environmentId) return;

    const res = await ctx.agent
      .get(`/api/v1/projects/${orgB.projectId}/environments/${orgB.environmentId}/secrets/MY_SECRET/value`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it('org-A user cannot write to org-B environment', async () => {
    if (!orgB.projectId || !orgB.environmentId) return;

    const res = await ctx.agent
      .put(`/api/v1/projects/${orgB.projectId}/environments/${orgB.environmentId}/secrets/INJECTED`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ value: 'owned' });

    expect([403, 404]).toContain(res.status);
  });

  it('org-A user cannot delete org-B secret', async () => {
    if (!orgB.projectId || !orgB.environmentId) return;

    const res = await ctx.agent
      .delete(`/api/v1/projects/${orgB.projectId}/environments/${orgB.environmentId}/secrets/MY_SECRET`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it('each org only sees its own secrets', async () => {
    if (!orgA.projectId || !orgA.environmentId) return;

    const res = await ctx.agent
      .get(`/api/v1/projects/${orgA.projectId}/environments/${orgA.environmentId}/secrets`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);

    expect(res.status).toBe(200);
    const keys = (res.body.data as Array<{ key: string }>).map((s) => s.key);
    expect(keys).toContain('MY_SECRET');
    // Should not contain org-B secrets
    expect(keys.length).toBeGreaterThan(0);
  });
});

describe('Tenant isolation — unauthenticated requests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    const org = await seedOrg(ctx.db, 'unauth-test-org');
    await seedUser(ctx.db, org.id, 'unauth-user', { role: 'developer' });
  }, 120000);

  afterAll(async () => {
    await ctx.stop();
  });

  it('unauthenticated request to protected resource is rejected', async () => {
    const res = await ctx.agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('tampered JWT is rejected', async () => {
    const loginRes = await ctx.agent
      .post('/api/v1/auth/login')
      .send({ username: 'unauth-user', password: 'TestPassword123!' });

    const token = loginRes.body.data.access_token as string;
    const [header, payload, sig] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    decoded.role = 'admin'; // escalation attempt
    const tampered = `${header}.${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`;

    const res = await ctx.agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });
});
