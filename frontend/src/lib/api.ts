const defaultBase = "http://localhost:8070";

export function apiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? defaultBase;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? defaultBase;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
  init?: RequestInit
): Promise<T> {
  const url = `${apiBase()}${path}`;
  const headers: HeadersInit = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (
    init?.body &&
    typeof init.body === "string" &&
    !(headers as Record<string, string>)["Content-Type"]
  ) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...init, headers });
  const data = await parseJson<T & { error?: string }>(res);
  if (!res.ok) {
    const msg =
      (data as { error?: string }).error ?? res.statusText ?? "Request failed";
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

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
  getSecrets(token: string, namespace: string, environment: string) {
    return request<SecretsRecord>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`,
      token
    );
  },
  getMeta(token: string, namespace: string, environment: string) {
    return request<MetaResponse>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/meta`,
      token
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
      { method: "PATCH", body: JSON.stringify(partial) }
    );
  },
  deleteKey(token: string, namespace: string, environment: string, key: string) {
    return request<{ status: string; key: string }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/keys/${encodeURIComponent(key)}`,
      token,
      { method: "DELETE" }
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
      { method: "POST", body: JSON.stringify({ payload }) }
    );
  },
  history(token: string, namespace: string, environment: string) {
    return request<{ history: HistoryEntry[] }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/history`,
      token
    );
  },
  audit(token: string, namespace: string, environment: string, limit = 100) {
    return request<{ logs: AuditEntry[] }>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/audit?limit=${limit}`,
      token
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
      { method: "POST", body: JSON.stringify({ template_key: templateKey }) }
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
      { method: "POST", body: JSON.stringify({ snapshot_id: snapshotId }) }
    );
  },
};
