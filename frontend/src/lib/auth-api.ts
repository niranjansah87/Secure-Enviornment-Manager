/**
 * Authentication service for Secure Environment Manager.
 * Handles JWT-based authentication for mobile, SDK, and web clients.
 */
import { apiBase } from "@/lib/api-base";

export type LoginRequest = {
  namespace?: string;
  environment?: string;
  password: string;
  username?: string;
  device_name?: string;
  device_type?: "mobile" | "desktop" | "cli" | "sdk" | "web";
  platform?: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  device_id: string | null;
  is_admin: boolean;
  credential_type: "dashboard_password" | "master_token" | "api_key" | "user_password";
  allowed_namespaces: string[];
  must_change_password: boolean;
  user_id: string | null;
  username: string | null;
  email: string | null;
};

export type RefreshRequest = {
  refresh_token: string;
};

export type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    request_id: string;
    timestamp: string;
    version: string;
  };
};

export type UserInfo = {
  session_id: string;
  namespace: string | null;
  environment: string | null;
  is_admin: boolean;
  device_id: string | null;
  scopes: string[];
  expires_at: string;
  token_type: string;
};

export type Device = {
  device_id: string;
  device_name: string;
  device_type: string;
  platform: string;
  created_at: string;
  last_active: string;
  is_revoked: boolean;
  user_agent: string;
  ip_address: string;
};

// Error codes from backend
export const ErrorCode = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_REFRESH_FAILED: "AUTH_REFRESH_FAILED",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  VALIDATION_MISSING_FIELD: "VALIDATION_MISSING_FIELD",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function parseAuthResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || !response.data) {
    throw new AuthError(
      response.error?.message ?? "Unknown error",
      response.error?.code ?? "UNKNOWN_ERROR",
      400,
      response.error?.details
    );
  }
  return response.data;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      namespace: request.namespace ?? "global",
      environment: request.environment ?? "main",
      password: request.password,
      username: request.username ?? "",
      device_name: request.device_name ?? "Web Browser",
      device_type: request.device_type ?? "web",
      platform: request.platform ?? (typeof navigator !== "undefined" ? navigator.platform : "unknown"),
    }),
  });

  const data: ApiResponse<LoginResponse> = await res.json();
  return parseAuthResponse(data);
}

export async function refresh(request: RefreshRequest): Promise<RefreshResponse> {
  const res = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data: ApiResponse<RefreshResponse> = await res.json();
  return parseAuthResponse(data);
}

export async function logout(accessToken: string): Promise<void> {
  await fetch(`${apiBase()}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });
}

export async function getCurrentUser(accessToken: string): Promise<UserInfo> {
  const res = await fetch(`${apiBase()}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<UserInfo> = await res.json();
  return parseAuthResponse(data);
}

export async function getDevices(accessToken: string): Promise<Device[]> {
  const res = await fetch(`${apiBase()}/api/v1/auth/devices`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<{ devices: Device[] }> = await res.json();
  return parseAuthResponse(data).devices;
}

export async function revokeDevice(accessToken: string, deviceId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/v1/auth/devices/${deviceId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<{ message: string }> = await res.json();
  parseAuthResponse(data);
}

export async function validatePassword(password: string): Promise<boolean> {
  const res = await fetch(`${apiBase()}/api/v1/auth/validate-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) return false;

  const data: ApiResponse<{ valid: boolean }> = await res.json();
  return data.success && (data.data?.valid ?? false);
}