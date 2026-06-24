/**
 * API client for Secure Environment Manager.
 * Centralizes all HTTP requests with unified error handling, logging, and auth.
 */
import { apiBase, ApiError } from "@/lib/api-base";
import { log, trackApi } from "@/logging/logger";
import { translateApiError, formatUnknownError } from "@/errors/translator";

export type EnvironmentsResponse = {
  environments: Record<string, string[]>;
};

export type StatsResponse = {
  environment_count: number;
  secret_count: number;
  last_updated: string | null;
  recent_activity: AuditEntry[];
};

export type AuditEntry = {
  timestamp: string;
  action: string;
  namespace?: string;
  environment?: string;
  resource?: string;
  user_id?: string;
  ip_address?: string;
  details?: Record<string, unknown>;
};

export type HistoryEntry = {
  id: string;
  timestamp: string;
  action: string;
  user_id: string;
  description: string;
};

export type TemplatesResponse = {
  templates: Record<
    string,
    { name: string; description?: string; variables: Record<string, string> }
  >;
};

export type SecretsRecord = Record<string, string>;

export type MetaResponse = {
  last_updated: string | null;
  variable_count: number;
};

export type AnalyticsResponse = {
  trends: {
    date: string;
    updates: number;
    access: number;
    auth: number;
    total: number;
  }[];
  distribution: {
    namespaces: {
      name: string;
      environments: number;
      estimated_secrets: number;
    }[];
    total_secrets: number;
    total_environments: number;
  };
  security_stats: {
    success: number;
    failures: number;
  };
  action_breakdown: {
    action: string;
    count: number;
  }[];
};

export type HealthResponse = {
  status: string;
  timestamp: string;
  checks: {
    encryption: { status: string; message: string };
    storage: { status: string; message: string; details?: Record<string, unknown> };
    process: { status: string; message: string; details?: Record<string, unknown> };
    folders: { status: string; message: string };
  };
};

export type ApiKey = {
  key_id: string;
  created_at: string;
  last_used: string | null;
  created_by: string;
  description: string;
  namespaces: string[];
  environments: string[];
  expires_at: string | null;
  status: string;
  custom_key: boolean;
  revoked_at?: string | null;
};

export type User = {
  user_id: string;
  username: string;
  email: string;
  role: "admin" | "developer";
  scopes: string[];
  must_change_password: boolean;
  status: "active" | "disabled";
  created_by: string;
  created_at: string;
  last_login: string | null;
  password_changed_at: string | null;
};

// Re-export ApiError and apiBase for convenience
export { ApiError, apiBase };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
  meta?: { namespace?: string; environment?: string }
): Promise<T> {
  const url = `${apiBase()}${path}`;
  const headers: Record<string, string> = {};
  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const tracker = trackApi(init?.method ?? "GET", path, {
    namespace: meta?.namespace,
    environment: meta?.environment,
  });

  let res: Response;
  let duration = 0;
  try {
    const start = performance.now();
    res = await fetch(url, { ...init, headers });
    duration = performance.now() - start;
  } catch (err) {
    tracker.onResponse(0, duration, err as Error);
    log.error(`Network error: ${(err as Error).message}`, err as Error);
    const userErr = formatUnknownError(err);
    throw new ApiError(userErr.description, 0, { code: userErr.code });
  }

  // Parse response - handle both old format (direct data) and new format (success/data envelope)
  const rawData = await parseJson<{
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; details?: Record<string, unknown> } | string;
    code?: string;
    error_string?: string;
  }>(res);

  // Check for new standardized API response format
  const errorObj = typeof rawData.error === 'object' ? rawData.error : null;
  if (rawData.success === false || errorObj) {
    const errorMsg = errorObj?.message ?? (typeof rawData.error === 'string' ? rawData.error : "Request failed");
    const errorCode = errorObj?.code ?? rawData.code ?? "UNKNOWN_ERROR";
    const userErr = translateApiError({
      message: errorMsg,
      status: res.status,
      body: rawData as Record<string, unknown>,
    });
    tracker.onResponse(res.status, duration, new Error(userErr.description));
    log.warn(`API error ${res.status} on ${path}: ${userErr.title}`);
    throw new ApiError(userErr.description, res.status, { code: errorCode });
  }

  // If new format with success:true, extract data
  if (rawData.success === true && rawData.data !== undefined) {
    tracker.onResponse(res.status, duration);
    return rawData.data;
  }

  // Legacy format - data is directly in the response body (including legacy error format)
  tracker.onResponse(res.status, duration);
  return rawData as T;
}

export const api = {
  metaEnvironments(token: string) {
    return request<EnvironmentsResponse>("/api/v1/meta/environments", token);
  },
  metaStats(token: string) {
    return request<StatsResponse>("/api/v1/meta/stats", token);
  },
  metaLogins(token: string) {
    return request<{ logins: AuditEntry[] }>("/api/v1/meta/logins", token);
  },
  metaAnalytics(token: string, days = 7) {
    return request<AnalyticsResponse>(`/api/v1/meta/analytics?days=${days}`, token);
  },
  metaHealth(token: string) {
    return request<HealthResponse>("/api/v1/meta/health", token);
  },
  getSecrets(token: string, namespace: string, environment: string) {
    return request<SecretsRecord>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`,
      token,
      undefined,
      { namespace, environment }
    );
  },
  getMeta(token: string, namespace: string, environment: string) {
    return request<MetaResponse>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/meta`,
      token,
      undefined,
      { namespace, environment }
    );
  },
  patchSecrets(
    token: string,
    namespace: string,
    environment: string,
    partial: SecretsRecord
  ) {
    return request<{ status: string; count: number }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`,
      token,
      { method: "PATCH", body: JSON.stringify(partial) },
      { namespace, environment }
    );
  },
  deleteKey(token: string, namespace: string, environment: string, key: string) {
    return request<{ status: string; key: string }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/keys/${encodeURIComponent(key)}`,
      token,
      { method: "DELETE" },
      { namespace, environment }
    );
  },
  bulkReplace(
    token: string,
    namespace: string,
    environment: string,
    payload: string
  ) {
    return request<{ status: string; count: number }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/bulk`,
      token,
      { method: "POST", body: JSON.stringify({ payload }) },
      { namespace, environment }
    );
  },
  history(token: string, namespace: string, environment: string) {
    return request<{ history: HistoryEntry[] }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/history`,
      token,
      undefined,
      { namespace, environment }
    );
  },
  audit(
    token: string,
    namespace: string,
    environment: string,
    limit = 50,
    offset = 0,
    action?: string
  ) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (action) params.set("action", action);
    return request<{
      logs: AuditEntry[];
      pagination: { offset: number; limit: number; total: number; has_more: boolean };
    }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/audit?${params}`,
      token,
      undefined,
      { namespace, environment }
    );
  },
  templatesList(token: string) {
    return request<TemplatesResponse>("/api/v1/templates", token);
  },
  applyTemplate(
    token: string,
    namespace: string,
    environment: string,
    templateKey: string
  ) {
    return request<{ status: string; template: string }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/templates/apply`,
      token,
      { method: "POST", body: JSON.stringify({ template_key: templateKey }) },
      { namespace, environment }
    );
  },
  rollback(
    token: string,
    namespace: string,
    environment: string,
    snapshotId: string
  ) {
    return request<{ status: string; timestamp: string }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/rollback`,
      token,
      { method: "POST", body: JSON.stringify({ snapshot_id: snapshotId }) },
      { namespace, environment }
    );
  },
  // Admin check (master token or dashboard password)
  isAdmin(token: string) {
    return request<{ is_admin: boolean }>("/api/v1/meta/is-admin", token);
  },
  // API Key Management (admin: master token or dashboard password)
  listKeys(token: string, namespace: string) {
    return request<{
      keys: Array<{
        key_id: string;
        created_at: string;
        last_used: string | null;
        created_by: string;
        description: string;
        namespaces: string[];
        environments: string[];
        expires_at: string | null;
        status: string;
        custom_key: boolean;
      }>
    }>(
      `/api/v1/keys/${encodeURIComponent(namespace)}`,
      token
    );
  },
  createKey(
    token: string,
    namespace: string,
    options?: {
      description?: string;
      validity_days?: number;
      custom_key?: string;
      namespaces?: string[];
      environments?: string[];
    }
  ) {
    return request<{
      key: string;
      key_id: string;
      namespace: string;
      description: string;
      validity_days: number;
      expires_at: string | null;
      namespaces: string[];
      environments: string[];
      message: string;
    }>(
      `/api/v1/keys/${encodeURIComponent(namespace)}`,
      token,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );
  },
  revokeKey(token: string, namespace: string, keyId: string) {
    return request<{ status: string; key_id: string }>(
      `/api/v1/keys/${encodeURIComponent(namespace)}/${encodeURIComponent(keyId)}`,
      token,
      { method: "DELETE" }
    );
  },
  getKey(token: string, namespace: string, keyId: string) {
    return request<ApiKey>(
      `/api/v1/keys/${encodeURIComponent(namespace)}/${encodeURIComponent(keyId)}`,
      token
    );
  },
  // User Management (admin only)
  listUsers(token: string) {
    return request<{ users: User[] }>("/api/v1/admin/users", token);
  },
  getUser(token: string, userId: string) {
    return request<{ user: User }>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, token);
  },
  createUser(
    token: string,
    data: {
      username: string;
      role?: string;
      email?: string;
      scopes?: string[];
    }
  ) {
    return request<{
      user_id: string;
      username: string;
      email: string;
      role: string;
      scopes: string[];
      temp_password: string;
      must_change_password: boolean;
      email_sent: boolean;
      message: string;
    }>("/api/v1/admin/users", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateUser(token: string, userId: string, updates: Partial<Pick<User, "email" | "role" | "scopes" | "status">> & Record<string, unknown>) {
    return request<{ user: User }>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
      token,
      { method: "PATCH", body: JSON.stringify(updates) }
    );
  },
  resetPassword(token: string, userId: string) {
    return request<{
      user_id: string;
      temp_password: string;
      must_change_password: boolean;
      email_sent: boolean;
      message: string;
    }>(`/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`, token, {
      method: "POST",
    });
  },
  deleteUser(token: string, userId: string) {
    return request<{ message: string; user_id: string }>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
      token,
      { method: "DELETE" }
    );
  },
};