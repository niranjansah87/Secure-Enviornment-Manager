/**
 * SEM V2 TypeScript SDK.
 * Wraps the REST API with typed methods and automatic token refresh.
 */
import type {
  SecretDto,
  SecretListItemDto,
  UpsertSecretRequest,
  BulkReplaceRequest,
  CompareResult,
  ExportFormat,
} from '@sem/types';
import type { ApiResponse, PaginatedResponse } from './types.js';

export interface SemClientOptions {
  /** Base URL of the SEM V2 API, e.g. https://sem.example.com */
  baseUrl: string;
  /** API key in sem_<id>_<secret> format, OR a username+password pair */
  apiKey?: string;
  username?: string;
  password?: string;
  /** Fetch implementation — defaults to global fetch (Node 18+) */
  fetch?: typeof fetch;
}

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export class SemClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly apiKey?: string;
  private readonly credentials?: { username: string; password: string };
  private tokenState: TokenState | null = null;

  constructor(opts: SemClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.fetchFn = opts.fetch ?? globalThis.fetch;

    if (opts.apiKey) {
      this.apiKey = opts.apiKey;
    } else if (opts.username && opts.password) {
      this.credentials = { username: opts.username, password: opts.password };
    } else {
      throw new Error('SemClient requires either apiKey or username+password');
    }
  }

  // ─── Secrets ───────────────────────────────────────────────────

  async listSecrets(projectId: string, environmentId: string): Promise<SecretListItemDto[]> {
    const res = await this.request<PaginatedResponse<SecretListItemDto>>(
      'GET',
      `/api/v1/projects/${projectId}/environments/${environmentId}/secrets`,
    );
    return res.data;
  }

  async getSecret(projectId: string, environmentId: string, key: string): Promise<SecretDto> {
    const res = await this.request<ApiResponse<SecretDto>>(
      'GET',
      `/api/v1/projects/${projectId}/environments/${environmentId}/secrets/${encodeURIComponent(key)}/value`,
    );
    return res.data;
  }

  async upsertSecret(
    projectId: string,
    environmentId: string,
    key: string,
    body: Omit<UpsertSecretRequest, 'key'>,
  ): Promise<SecretDto> {
    const res = await this.request<ApiResponse<SecretDto>>(
      'PUT',
      `/api/v1/projects/${projectId}/environments/${environmentId}/secrets/${encodeURIComponent(key)}`,
      body,
    );
    return res.data;
  }

  async deleteSecret(projectId: string, environmentId: string, key: string): Promise<void> {
    await this.request<ApiResponse<void>>(
      'DELETE',
      `/api/v1/projects/${projectId}/environments/${environmentId}/secrets/${encodeURIComponent(key)}`,
    );
  }

  async bulkReplaceSecrets(
    projectId: string,
    environmentId: string,
    body: BulkReplaceRequest,
  ): Promise<void> {
    await this.request<ApiResponse<void>>(
      'PUT',
      `/api/v1/projects/${projectId}/environments/${environmentId}/secrets`,
      body,
    );
  }

  async exportSecrets(
    projectId: string,
    environmentId: string,
    format: ExportFormat = 'env',
  ): Promise<string> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/api/v1/projects/${projectId}/environments/${environmentId}/secrets/export?format=${format}`;
    const res = await this.fetchFn(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) await this.throwApiError(res);
    return res.text();
  }

  async compareEnvironments(
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<CompareResult> {
    const res = await this.request<ApiResponse<CompareResult>>(
      'GET',
      `/api/v1/projects/${projectId}/environments/${sourceEnvId}/compare/${targetEnvId}`,
    );
    return res.data;
  }

  // ─── Auth helpers ───────────────────────────────────────────────

  async logout(): Promise<void> {
    if (!this.tokenState) return;
    await this.request<ApiResponse<void>>('POST', '/api/v1/auth/logout');
    this.tokenState = null;
  }

  // ─── Internals ─────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getAccessToken();
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) await this.throwApiError(res);
    return res.json() as Promise<T>;
  }

  private async getAccessToken(): Promise<string> {
    // API key auth — exchange once for a token, then refresh as needed
    if (this.apiKey) {
      if (this.tokenState && this.tokenState.expiresAt > Date.now() + 30_000) {
        return this.tokenState.accessToken;
      }
      return this.loginWithApiKey();
    }

    // Username/password auth
    if (!this.tokenState || this.tokenState.expiresAt <= Date.now() + 30_000) {
      if (this.tokenState?.refreshToken) {
        try {
          return await this.rotateRefreshToken();
        } catch {
          // Fall through to full login
        }
      }
      return this.loginWithPassword();
    }
    return this.tokenState.accessToken;
  }

  private async loginWithApiKey(): Promise<string> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    });
    if (!res.ok) await this.throwApiError(res);
    return this.storeTokenResponse(await res.json());
  }

  private async loginWithPassword(): Promise<string> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.credentials),
    });
    if (!res.ok) await this.throwApiError(res);
    return this.storeTokenResponse(await res.json());
  }

  private async rotateRefreshToken(): Promise<string> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.tokenState!.refreshToken }),
    });
    if (!res.ok) throw new Error('Token refresh failed');
    return this.storeTokenResponse(await res.json());
  }

  private storeTokenResponse(body: {
    data: { access_token: string; refresh_token: string; expires_in: number };
  }): string {
    this.tokenState = {
      accessToken: body.data.access_token,
      refreshToken: body.data.refresh_token,
      expiresAt: Date.now() + body.data.expires_in * 1000,
    };
    return this.tokenState.accessToken;
  }

  private async throwApiError(res: Response): Promise<never> {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { error: { code: 'UNKNOWN', message: res.statusText } };
    }
    const err = new Error(
      (body as { error?: { message?: string } })?.error?.message ?? res.statusText,
    );
    (err as Error & { status: number; code: string }).status = res.status;
    (err as Error & { status: number; code: string }).code =
      (body as { error?: { code?: string } })?.error?.code ?? 'UNKNOWN';
    throw err;
  }
}
