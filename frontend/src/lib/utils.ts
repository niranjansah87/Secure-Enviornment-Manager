import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIso(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return ts;
  }
}

export function maskValue(value: string, visible: boolean): string {
  if (visible) return value;
  if (!value) return "—";
  return "•".repeat(Math.min(value.length, 24));
}

const WORKSPACE_KEY = "sem_workspace";
const TOKEN_KEY = "sem_api_token";
const ACCESS_TOKEN_KEY = "sem_access_token";
const REFRESH_TOKEN_KEY = "sem_refresh_token";
const DEVICE_ID_KEY = "sem_device_id";

export type Workspace = { namespace: string; environment: string };

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  deviceId?: string;
};

export function loadWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Workspace;
    if (p?.namespace && p?.environment) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveWorkspace(w: Workspace) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w));
}

export function loadAccessToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function saveAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function loadRefreshToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
}

export function saveRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function loadDeviceId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DEVICE_ID_KEY) ?? "";
}

export function saveDeviceId(deviceId: string) {
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

// Legacy support - for API key based auth
export function loadToken(): string {
  // First check for new JWT tokens
  const accessToken = loadAccessToken();
  if (accessToken) return accessToken;
  // Fallback to legacy token
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveToken(token: string) {
  // Also save as access token for compatibility
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
}

export function saveAuthTokens(tokens: AuthTokens) {
  saveAccessToken(tokens.accessToken);
  saveRefreshToken(tokens.refreshToken);
  if (tokens.deviceId) {
    saveDeviceId(tokens.deviceId);
  }
  // Also save to legacy key for compatibility
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function hasRefreshToken(): boolean {
  return !!loadRefreshToken();
}
