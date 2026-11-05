/**
 * SEM v2 API client — typed wrapper over the NestJS backend (apps/api).
 *
 * Contract notes:
 *  - All responses use the envelope `{ success, data }` / `{ success, error }`.
 *  - Routes are UUID + org scoped under `/api/v1`.
 *  - `secrets.list` and `apiKeys.list` return camelCase from Drizzle; we
 *    normalize those two to snake_case so the UI has one consistent shape.
 */
import { apiBase, ApiError } from "@/lib/api-base";
import { trackApi } from "@/logging/logger";
import { translateApiError, formatUnknownError } from "@/errors/translator";

export { ApiError, apiBase };

// ─── Domain types (snake_case, UI-facing) ───────────────────────────────────

export type UserRole = "admin" | "developer" | "viewer";

export type LoginResult = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
};

export type Me = {
  id: string;
  org_id: string;
  role: UserRole;
  scopes: string[];
  session_id: string;
  auth_method: string;
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export type Session = {
  id: string;
  device_name: string | null;
  device_ip: string | null;
  user_agent: string | null;
  last_active_at: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  org_id: string;
  created_at: string;
};

export type Environment = {
  id: string;
  slug: string;
  name: string;
  project_id: string;
  created_at: string;
};

export type SecretMeta = {
  id: string;
  key: string;
  description: string | null;
  is_sensitive: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

export type SecretChangeType = "create" | "update" | "delete" | "restore";

export type SecretVersion = {
  id: string;
  version: number;
  change_type: SecretChangeType;
  changed_by: string | null;
  created_at: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  user_id: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

export type ApiKeyCreated = {
  id: string;
  name: string;
  key: string; // raw key, shown once
  key_prefix: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
};

export type User = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  scopes: string[];
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

export type UserCreated = User & { temp_password: string; message: string };

export type AuditEvent = {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
};

export type AuditPage = {
  events: AuditEvent[];
  pagination: { total: number; limit: number; offset: number };
};

export type AnalyticsSummary = {
  projects: number;
  active_users: number;
  audit_events_last_30d: number;
};

export type TopAction = { action: string; count: number };

export type ExportFormat = "env" | "json" | "docker";

// Scopes the backend recognizes for API keys (mirror of API_KEY_SCOPES).
export const API_KEY_SCOPES = [
  "secrets:read",
  "secrets:write",
  "secrets:delete",
  "secrets:export",
  "admin:users",
  "admin:projects",
  "admin:environments",
] as const;

// ─── Core request ────────────────────────────────────────────────────────────

type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: Record<string, unknown> } | string;
  pagination?: { total: number; limit: number; offset: number };
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Envelope<T>;
  } catch {
    return {};
  }
}

type RequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
  /** Return the whole envelope (for endpoints that carry `pagination`). */
  raw?: boolean;
  signal?: AbortSignal;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${apiBase()}${path}`;
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }

  const method = opts.method ?? "GET";
  const tracker = trackApi(method, path);

  let res: Response;
  const start = performance.now();
  try {
    res = await fetch(url, { method, headers, body, signal: opts.signal });
  } catch (err) {
    const duration = performance.now() - start;
    tracker.onResponse(0, duration, err as Error);
    const userErr = formatUnknownError(err);
    throw new ApiError(userErr.description, 0, { code: userErr.code });
  }
  const duration = performance.now() - start;

  const envelope = await parseJson<T>(res);
  const errorObj = typeof envelope.error === "object" ? envelope.error : null;

  if (!res.ok || envelope.success === false || errorObj) {
    const message =
      errorObj?.message ??
      (typeof envelope.error === "string" ? envelope.error : null) ??
      `Request failed (${res.status})`;
    const code = errorObj?.code ?? "UNKNOWN_ERROR";
    const userErr = translateApiError({ message, status: res.status, body: envelope as Record<string, unknown> });
    tracker.onResponse(res.status, duration, new Error(userErr.description));
    throw new ApiError(userErr.description, res.status, { code });
  }

  tracker.onResponse(res.status, duration);

  if (opts.raw) return envelope as unknown as T;
  return (envelope.data ?? ({} as T)) as T;
}

// ─── Normalizers for the two camelCase list endpoints ────────────────────────

type RawSecretMeta = {
  id: string;
  key: string;
  description: string | null;
  isSensitive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

function toSecretMeta(s: RawSecretMeta): SecretMeta {
  return {
    id: s.id,
    key: s.key,
    description: s.description,
    is_sensitive: s.isSensitive,
    version: s.version,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

type RawVersion = {
  id: string;
  version: number;
  changeType: SecretChangeType;
  changedBy: string | null;
  createdAt: string;
};

function toVersion(v: RawVersion): SecretVersion {
  return {
    id: v.id,
    version: v.version,
    change_type: v.changeType,
    changed_by: v.changedBy,
    created_at: v.createdAt,
  };
}

type RawApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  userId: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
};

function toApiKey(k: RawApiKey): ApiKey {
  return {
    id: k.id,
    name: k.name,
    key_prefix: k.keyPrefix,
    scopes: k.scopes,
    user_id: k.userId,
    last_used_at: k.lastUsedAt,
    expires_at: k.expiresAt,
    revoked: k.revoked,
    created_at: k.createdAt,
  };
}

// ─── Public API surface ──────────────────────────────────────────────────────

export type LoginParams = {
  username?: string;
  password?: string;
  api_key?: string;
  master_token?: string;
  device_name?: string;
};

export const sem = {
  // Auth (public endpoints take no token)
  login(params: LoginParams) {
    return request<LoginResult>("/api/v1/auth/login", { method: "POST", body: params });
  },
  refresh(refreshToken: string) {
    return request<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
      "/api/v1/auth/refresh",
      { method: "POST", body: { refresh_token: refreshToken } },
    );
  },
  logout(token: string) {
    return request<{ message: string }>("/api/v1/auth/logout", { method: "POST", token });
  },
  logoutAll(token: string) {
    return request<{ message: string }>("/api/v1/auth/logout-all", { method: "POST", token });
  },
  me(token: string) {
    return request<Me>("/api/v1/auth/me", { token });
  },
  sessions(token: string) {
    return request<Session[]>("/api/v1/auth/sessions", { token });
  },
  revokeSession(token: string, id: string) {
    return request<{ message: string }>(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  changePassword(token: string, currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/api/v1/auth/change-password", {
      method: "POST",
      token,
      body: { current_password: currentPassword, new_password: newPassword },
    });
  },

  // Organizations
  currentOrg(token: string) {
    return request<Organization>("/api/v1/organizations/current", { token });
  },

  // Projects
  listProjects(token: string) {
    return request<Project[]>("/api/v1/projects", { token });
  },
  getProject(token: string, id: string) {
    return request<Project>(`/api/v1/projects/${encodeURIComponent(id)}`, { token });
  },
  createProject(token: string, name: string, slug: string) {
    return request<Project>("/api/v1/projects", { method: "POST", token, body: { name, slug } });
  },
  deleteProject(token: string, id: string) {
    return request<{ message: string }>(`/api/v1/projects/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Environments
  listEnvironments(token: string, projectId: string) {
    return request<Environment[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/environments`, { token });
  },
  createEnvironment(token: string, projectId: string, name: string, slug: string) {
    return request<Environment>(`/api/v1/projects/${encodeURIComponent(projectId)}/environments`, {
      method: "POST",
      token,
      body: { name, slug },
    });
  },
  deleteEnvironment(token: string, projectId: string, id: string) {
    return request<{ message: string }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(id)}`,
      { method: "DELETE", token },
    );
  },

  // Secrets
  async listSecrets(token: string, projectId: string, environmentId: string): Promise<SecretMeta[]> {
    const raw = await request<RawSecretMeta[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets`,
      { token },
    );
    return raw.map(toSecretMeta);
  },
  getSecretValue(token: string, projectId: string, environmentId: string, key: string) {
    return request<{ key: string; value: string }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/${encodeURIComponent(key)}/value`,
      { token },
    );
  },
  upsertSecret(
    token: string,
    projectId: string,
    environmentId: string,
    key: string,
    body: { value: string; description?: string; is_sensitive?: boolean },
  ) {
    return request<{ id: string; key: string; description: string | null; is_sensitive: boolean; version: number; created_at: string; updated_at: string }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/${encodeURIComponent(key)}`,
      { method: "PUT", token, body },
    );
  },
  deleteSecret(token: string, projectId: string, environmentId: string, key: string) {
    return request<{ message: string }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/${encodeURIComponent(key)}`,
      { method: "DELETE", token },
    );
  },
  exportSecrets(token: string, projectId: string, environmentId: string, format: ExportFormat) {
    return request<{ format: ExportFormat; content: string }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/export?format=${format}`,
      { token },
    );
  },
  bulkReplaceSecrets(
    token: string,
    projectId: string,
    environmentId: string,
    secrets: Array<{ key: string; value: string; description?: string; is_sensitive?: boolean }>,
  ) {
    return request<{ count: number }>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/bulk`,
      { method: "POST", token, body: { secrets } },
    );
  },
  async listVersions(token: string, projectId: string, environmentId: string, key: string): Promise<SecretVersion[]> {
    const raw = await request<RawVersion[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/${encodeURIComponent(key)}/versions`,
      { token },
    );
    return raw.map(toVersion);
  },
  rollbackSecret(token: string, projectId: string, environmentId: string, key: string, version: number) {
    return request<unknown>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}/secrets/${encodeURIComponent(key)}/rollback/${version}`,
      { method: "POST", token },
    );
  },

  // Remote config — bulk {key: value} for a project/env by slug (used by Compare)
  remoteConfig(token: string, projectSlug: string, environmentSlug: string) {
    return request<Record<string, string>>(
      `/api/v1/remote/${encodeURIComponent(projectSlug)}/${encodeURIComponent(environmentSlug)}`,
      { token },
    );
  },

  // API keys
  async listApiKeys(token: string): Promise<ApiKey[]> {
    const raw = await request<RawApiKey[]>("/api/v1/api-keys", { token });
    return raw.map(toApiKey);
  },
  createApiKey(
    token: string,
    body: { name: string; scopes: string[]; user_id?: string; expires_at?: string },
  ) {
    return request<ApiKeyCreated>("/api/v1/api-keys", { method: "POST", token, body });
  },
  revokeApiKey(token: string, id: string) {
    return request<{ message: string }>(`/api/v1/api-keys/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Users (admin)
  listUsers(token: string) {
    return request<User[]>("/api/v1/admin/users", { token });
  },
  createUser(token: string, body: { username: string; email?: string; role?: UserRole; scopes?: string[] }) {
    return request<UserCreated>("/api/v1/admin/users", { method: "POST", token, body });
  },
  updateUser(
    token: string,
    id: string,
    body: { email?: string; role?: UserRole; scopes?: string[]; is_active?: boolean },
  ) {
    return request<User>(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: "PUT", token, body });
  },
  deleteUser(token: string, id: string) {
    return request<{ message: string }>(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Audit
  async audit(
    token: string,
    params: {
      action?: string;
      actor_id?: string;
      resource_type?: string;
      resource_id?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<AuditPage> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const env = await request<{ data: AuditEvent[]; pagination: AuditPage["pagination"] }>(
      `/api/v1/audit${qs.toString() ? `?${qs}` : ""}`,
      { token, raw: true },
    );
    return { events: env.data ?? [], pagination: env.pagination ?? { total: 0, limit: params.limit ?? 50, offset: params.offset ?? 0 } };
  },

  // Analytics
  analyticsSummary(token: string) {
    return request<AnalyticsSummary>("/api/v1/analytics/summary", { token });
  },
  topActions(token: string) {
    return request<TopAction[]>("/api/v1/analytics/top-actions", { token });
  },
};

export type SemApi = typeof sem;
