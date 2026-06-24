"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ApiError } from "@/lib/api";
import { formatUserError } from "@/lib/error-translation";
import {
  loadToken,
  loadWorkspace,
  saveToken,
  saveWorkspace,
  saveAuthTokens,
  clearAuthTokens,
  loadRefreshToken,
  loadAccessToken,
  loadDeviceId,
  type Workspace,
} from "@/lib/utils";
import { login, refresh, logout as apiLogout, AuthError } from "@/lib/auth-api";

type WorkspaceContextValue = {
  token: string;
  setToken: (t: string) => void;
  workspace: Workspace | null;
  setWorkspace: (w: Workspace) => void;
  environments: Record<string, string[]>;
  refreshEnvironments: () => Promise<void>;
  envError: string | null;
  loadingEnvs: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  credentialType: "dashboard_password" | "master_token" | "api_key" | "user_password" | null;
  allowedNamespaces: string[];
  deviceId: string | null;
  username: string | null;
  email: string | null;
  mustChangePassword: boolean;
  loginWithPassword: (password: string, namespace?: string, environment?: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState("");
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [environments, setEnvironments] = useState<Record<string, string[]>>({});
  const [envError, setEnvError] = useState<string | null>(null);
  const [loadingEnvs, setLoadingEnvs] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentialType, setCredentialType] = useState<"dashboard_password" | "master_token" | "api_key" | "user_password" | null>(null);
  const [allowedNamespaces, setAllowedNamespaces] = useState<string[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Initialize from storage
  useEffect(() => {
    const accessToken = loadAccessToken();
    const refreshToken = loadRefreshToken();
    const storedDeviceId = loadDeviceId();

    if (accessToken) {
      setTokenState(accessToken);
      // Restore is_admin from saved JWT payload without a round-trip
      try {
        const parts = accessToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (typeof payload.is_admin === "boolean") setIsAdmin(payload.is_admin);
          if (payload.username) setUsername(payload.username as string);
          if (payload.email) setEmail(payload.email as string);
          if (typeof payload.must_change_password === "boolean") setMustChangePassword(payload.must_change_password);
        }
      } catch {
        // ignore malformed token
      }
    }
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }

    // Try to restore session from refresh token if no access token
    if (!accessToken && refreshToken) {
      // Will trigger refresh in the auth flow
    }

    setWorkspaceState(loadWorkspace());
  }, []);

  const isAuthenticated = useMemo(() => {
    return !!token && token.length > 0;
  }, [token]);

  const setToken = useCallback((t: string) => {
    saveToken(t);
    setTokenState(t);
  }, []);

  const setWorkspace = useCallback((w: Workspace) => {
    saveWorkspace(w);
    setWorkspaceState(w);
  }, []);

  const loginWithPassword = useCallback(async (
    password: string,
    namespace: string = "global",
    environment: string = "main",
    usernameArg: string = "",
  ): Promise<void> => {
    try {
      const response = await login({
        namespace,
        environment,
        password,
        username: usernameArg || undefined,
        device_name: "Web Browser",
        device_type: "web",
        platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      });

      saveAuthTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        deviceId: response.device_id ?? undefined,
      });

      setTokenState(response.access_token);
      setIsAdmin(response.is_admin ?? false);
      setCredentialType(response.credential_type ?? null);
      setAllowedNamespaces(response.allowed_namespaces ?? []);
      setUsername(response.username ?? null);
      setEmail(response.email ?? null);
      setMustChangePassword(response.must_change_password ?? false);
      if (response.device_id) {
        setDeviceId(response.device_id);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const accessToken = loadAccessToken();
    if (accessToken) {
      try {
        await apiLogout(accessToken);
      } catch {
        // Continue with local cleanup even if API call fails
      }
    }

    // Clear all tokens
    clearAuthTokens();
    setTokenState("");
    setDeviceId(null);
    setEnvironments({});
    setWorkspaceState(null);
    setUsername(null);
    setEmail(null);
    setMustChangePassword(false);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = loadRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await refresh({ refresh_token: refreshToken });
      saveAuthTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        deviceId: loadDeviceId() || undefined,
      });
      setTokenState(response.access_token);
      return true;
    } catch {
      // Refresh failed - clear tokens
      clearAuthTokens();
      setTokenState("");
      return false;
    }
  }, []);

  const refreshEnvironments = useCallback(async () => {
    const t = loadToken();
    if (!t) {
      setEnvironments({});
      setEnvError("Add an API token in Settings.");
      return;
    }
    setLoadingEnvs(true);
    setEnvError(null);
    try {
      const res = await api.metaEnvironments(t);
      setEnvironments(res.environments ?? {});
    } catch (e) {
      // If token expired/invalid, try to refresh (handles both 401 and 403)
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          const newToken = loadToken();
          const res = await api.metaEnvironments(newToken);
          setEnvironments(res.environments ?? {});
          return;
        }
      }
      const err = formatUserError(e);
      setEnvError(err.description);
      setEnvironments({});
    } finally {
      setLoadingEnvs(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    if (token) {
      void refreshEnvironments();
    }
  }, [token, refreshEnvironments]);

  // Proactive token refresh: refresh 3 minutes before expiry (JWT TTL is 15 min)
  useEffect(() => {
    if (!token) return;

    let expiryTimestamp: number | null = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp) {
          expiryTimestamp = payload.exp * 1000; // JWT exp is in seconds
        }
      }
    } catch {
      // Can't decode token — skip proactive refresh
    }

    if (!expiryTimestamp) return;

    const refreshBufferMs = 3 * 60 * 1000; // 3 minutes before expiry
    const delayMs = Math.max(0, expiryTimestamp - Date.now() - refreshBufferMs);

    const timer = setTimeout(() => {
      void refreshAccessToken();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [token, refreshAccessToken]);

  const value = useMemo(
    () => ({
      token,
      setToken,
      workspace,
      setWorkspace,
      environments,
      refreshEnvironments,
      envError,
      loadingEnvs,
      isAuthenticated,
      isAdmin,
      credentialType,
      allowedNamespaces,
      deviceId,
      username,
      email,
      mustChangePassword,
      loginWithPassword,
      logout,
      refreshAccessToken,
    }),
    [
      token,
      setToken,
      workspace,
      setWorkspace,
      environments,
      refreshEnvironments,
      envError,
      loadingEnvs,
      isAuthenticated,
      isAdmin,
      credentialType,
      allowedNamespaces,
      deviceId,
      username,
      email,
      mustChangePassword,
      loginWithPassword,
      logout,
      refreshAccessToken,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}