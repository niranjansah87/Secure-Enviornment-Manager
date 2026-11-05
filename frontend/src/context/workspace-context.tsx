"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  sem,
  ApiError,
  type Me,
  type Organization,
  type Project,
  type Environment,
  type LoginParams,
  type UserRole,
} from "@/lib/sem-api";
import {
  loadAccessToken,
  loadRefreshToken,
  saveAuthTokens,
  clearAuthTokens,
} from "@/lib/utils";

export type Workspace = { projectSlug: string; envSlug: string };

const WORKSPACE_KEY = "sem_workspace_v2";

function loadWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Workspace;
    if (p?.projectSlug && p?.envSlug) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function saveWorkspace(w: Workspace) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

function decodeExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

type WorkspaceContextValue = {
  // Auth
  token: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: UserRole | null;
  scopes: string[];
  orgId: string | null;
  authMethod: string | null;
  mustChangePassword: boolean;
  me: Me | null;
  org: Organization | null;
  displayName: string;
  login: (params: LoginParams) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<void>;
  clearMustChangePassword: () => void;
  /** Run an authed API call, auto-refreshing the token once on 401. */
  call: <T>(fn: (token: string) => Promise<T>) => Promise<T>;

  // Workspace
  projects: Project[];
  loadingProjects: boolean;
  projectsError: string | null;
  refreshProjects: () => Promise<void>;
  environments: Environment[]; // for the current project
  currentProject: Project | null;
  currentEnvironment: Environment | null;
  workspace: Workspace | null;
  selectWorkspace: (projectSlug: string, envSlug: string) => void;
  environmentsFor: (projectId: string) => Promise<Environment[]>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [envCache, setEnvCache] = useState<Record<string, Environment[]>>({});
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const isAuthenticated = token.length > 0;
  const role = me?.role ?? null;
  const isAdmin = role === "admin";
  const scopes = useMemo(() => me?.scopes ?? [], [me]);
  const orgId = me?.org_id ?? null;
  const authMethod = me?.auth_method ?? null;

  const displayName = useMemo(() => {
    if (org?.name) return org.name;
    if (authMethod === "api_key") return "API Key";
    if (isAdmin) return "Administrator";
    return "Developer";
  }, [org?.name, authMethod, isAdmin]);

  // ── Token refresh ──────────────────────────────────────────────────────────
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const refreshToken = loadRefreshToken();
    if (!refreshToken) return false;

    const run = (async () => {
      try {
        const tokens = await sem.refresh(refreshToken);
        saveAuthTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        setToken(tokens.access_token);
        return true;
      } catch {
        clearAuthTokens();
        setToken("");
        setMe(null);
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = run;
    return run;
  }, []);

  const call = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      const current = loadAccessToken();
      try {
        return await fn(current);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          const ok = await refreshAccessToken();
          if (ok) return await fn(loadAccessToken());
        }
        throw e;
      }
    },
    [refreshAccessToken],
  );

  // ── Identity bootstrap ───────────────────────────────────────────────────────
  const loadIdentity = useCallback(async () => {
    try {
      const [meRes, orgRes] = await Promise.all([
        call((t) => sem.me(t)),
        call((t) => sem.currentOrg(t)).catch(() => null),
      ]);
      setMe(meRes);
      if (orgRes) setOrg(orgRes);
    } catch {
      // token invalid and refresh failed → caller will see unauthenticated state
    }
  }, [call]);

  // On mount: restore access token, then load identity.
  useEffect(() => {
    const existing = loadAccessToken();
    if (existing) setToken(existing);
    setWorkspace(loadWorkspace());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) void loadIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Proactive refresh ~3 min before expiry.
  useEffect(() => {
    if (!token) return;
    const exp = decodeExp(token);
    if (!exp) return;
    const delay = Math.max(0, exp - Date.now() - 3 * 60 * 1000);
    const timer = setTimeout(() => void refreshAccessToken(), delay);
    return () => clearTimeout(timer);
  }, [token, refreshAccessToken]);

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const login = useCallback(async (params: LoginParams) => {
    const res = await sem.login(params);
    saveAuthTokens({ accessToken: res.access_token, refreshToken: res.refresh_token });
    setToken(res.access_token);
    setMustChangePassword(res.must_change_password);
    return { mustChangePassword: res.must_change_password };
  }, []);

  const logout = useCallback(async () => {
    const t = loadAccessToken();
    if (t) {
      try {
        await sem.logout(t);
      } catch {
        /* local cleanup regardless */
      }
    }
    clearAuthTokens();
    setToken("");
    setMe(null);
    setOrg(null);
    setProjects([]);
    setEnvCache({});
    setMustChangePassword(false);
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      await call((t) => sem.changePassword(t, current, next));
      setMustChangePassword(false);
    },
    [call],
  );

  const clearMustChangePassword = useCallback(() => setMustChangePassword(false), []);

  // ── Projects / environments ──────────────────────────────────────────────────
  const refreshProjects = useCallback(async () => {
    if (!token) return;
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const list = await call((t) => sem.listProjects(t));
      setProjects(list);
    } catch (e) {
      setProjectsError(e instanceof ApiError ? e.message : "Failed to load projects");
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [token, call]);

  useEffect(() => {
    if (token) void refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const environmentsFor = useCallback(
    async (projectId: string): Promise<Environment[]> => {
      if (envCache[projectId]) return envCache[projectId];
      const envs = await call((t) => sem.listEnvironments(t, projectId));
      setEnvCache((prev) => ({ ...prev, [projectId]: envs }));
      return envs;
    },
    [call, envCache],
  );

  const currentProject = useMemo(
    () => projects.find((p) => p.slug === workspace?.projectSlug) ?? null,
    [projects, workspace],
  );

  const environments = useMemo(
    () => (currentProject ? envCache[currentProject.id] ?? [] : []),
    [currentProject, envCache],
  );

  const currentEnvironment = useMemo(
    () => environments.find((e) => e.slug === workspace?.envSlug) ?? null,
    [environments, workspace],
  );

  // Load environments for the current project when it resolves.
  useEffect(() => {
    if (currentProject && !envCache[currentProject.id]) {
      void environmentsFor(currentProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  // Default the workspace to the first project/env once projects load.
  useEffect(() => {
    if (workspace || projects.length === 0) return;
    const first = projects[0];
    void (async () => {
      const envs = await environmentsFor(first.id);
      if (envs.length > 0) {
        const preferred = envs.find((e) => e.slug === "production") ?? envs[0];
        const next = { projectSlug: first.slug, envSlug: preferred.slug };
        saveWorkspace(next);
        setWorkspace(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, workspace]);

  const selectWorkspace = useCallback((projectSlug: string, envSlug: string) => {
    const next = { projectSlug, envSlug };
    saveWorkspace(next);
    setWorkspace(next);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      token,
      isAuthenticated,
      isAdmin,
      role,
      scopes,
      orgId,
      authMethod,
      mustChangePassword,
      me,
      org,
      displayName,
      login,
      logout,
      refreshAccessToken,
      changePassword,
      clearMustChangePassword,
      call,
      projects,
      loadingProjects,
      projectsError,
      refreshProjects,
      environments,
      currentProject,
      currentEnvironment,
      workspace,
      selectWorkspace,
      environmentsFor,
    }),
    [
      token, isAuthenticated, isAdmin, role, scopes, orgId, authMethod, mustChangePassword,
      me, org, displayName, login, logout, refreshAccessToken, changePassword, clearMustChangePassword,
      call, projects, loadingProjects, projectsError, refreshProjects, environments,
      currentProject, currentEnvironment, workspace, selectWorkspace, environmentsFor,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
