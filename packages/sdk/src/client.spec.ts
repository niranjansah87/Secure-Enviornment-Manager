import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemClient } from './client';

describe('SemClient', () => {
  const baseUrl = 'http://localhost:3001';

  it('throws an error if neither apiKey nor credentials are provided', () => {
    expect(() => new SemClient({ baseUrl })).toThrow(
      'SemClient requires either apiKey or username+password',
    );
  });

  it('initializes successfully with apiKey', () => {
    const client = new SemClient({ baseUrl, apiKey: 'sem_1234567890abcdef_secret' });
    expect(client).toBeInstanceOf(SemClient);
  });

  it('initializes successfully with username and password', () => {
    const client = new SemClient({ baseUrl, username: 'admin', password: 'password123' });
    expect(client).toBeInstanceOf(SemClient);
  });

  it('authenticates with apiKey and caches access token', async () => {
    const mockFetch = vi.fn();
    // Login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
        },
      }),
    });
    // listSecrets response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 'sec_1', key: 'DB_HOST', version: 1 }],
      }),
    });

    const client = new SemClient({
      baseUrl,
      apiKey: 'sem_test_key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const secrets = await client.listSecrets('proj_1', 'env_1');
    expect(secrets).toHaveLength(1);
    expect(secrets[0].key).toBe('DB_HOST');

    // Verify first call was login
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/api/v1/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ api_key: 'sem_test_key' }),
      }),
    );

    // Verify second call was list with Authorization bearer token
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}/api/v1/projects/proj_1/environments/env_1/secrets`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access_token',
        }),
      }),
    );
  });

  it('retrieves secret value and performs upsert/delete', async () => {
    const mockFetch = vi.fn();
    // Login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { access_token: 'token_1', refresh_token: 'ref_1', expires_in: 3600 },
      }),
    });
    // getSecret response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: 'sec_1', key: 'API_KEY', value: 'secret-val-123', version: 1 },
      }),
    });
    // upsert response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: 'sec_1', key: 'API_KEY', value: 'secret-val-456', version: 2 },
      }),
    });
    // delete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: null }),
    });

    const client = new SemClient({
      baseUrl,
      apiKey: 'sem_test_key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const secret = await client.getSecret('proj_1', 'env_1', 'API_KEY');
    expect(secret.value).toBe('secret-val-123');

    const updated = await client.upsertSecret('proj_1', 'env_1', 'API_KEY', {
      value: 'secret-val-456',
    });
    expect(updated.version).toBe(2);

    await expect(client.deleteSecret('proj_1', 'env_1', 'API_KEY')).resolves.toBeUndefined();
  });

  it('handles API error responses cleanly', async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid API key or credentials' },
      }),
    });

    const client = new SemClient({
      baseUrl,
      apiKey: 'sem_bad_key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    await expect(client.listSecrets('proj_1', 'env_1')).rejects.toThrow(
      'Invalid API key or credentials',
    );
  });

  it('supports export and environment comparison', async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { access_token: 'token_1', refresh_token: 'ref_1', expires_in: 3600 },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { format: 'env', content: 'FOO=bar\nBAZ=qux' },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { differences: [], commonKeys: ['FOO'] },
      }),
    });

    const client = new SemClient({
      baseUrl,
      apiKey: 'sem_test_key',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const envContent = await client.exportSecrets('proj_1', 'env_1', 'env');
    expect(envContent).toContain('FOO=bar');

    const diff = await client.compareEnvironments('proj_1', 'env_1', 'env_2');
    expect(diff.commonKeys).toEqual(['FOO']);
  });
});
