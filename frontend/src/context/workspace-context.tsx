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
import {
  loadToken,
  loadWorkspace,
  saveToken,
  saveWorkspace,
  type Workspace,
} from "@/lib/utils";

type WorkspaceContextValue = {
  token: string;
  setToken: (t: string) => void;
  workspace: Workspace | null;
  setWorkspace: (w: Workspace) => void;
  environments: Record<string, string[]>;
  refreshEnvironments: () => Promise<void>;
  envError: string | null;
  loadingEnvs: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState("");
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [environments, setEnvironments] = useState<Record<string, string[]>>(
    {}
  );
  const [envError, setEnvError] = useState<string | null>(null);
  const [loadingEnvs, setLoadingEnvs] = useState(false);

  useEffect(() => {
    setTokenState(loadToken());
    setWorkspaceState(loadWorkspace());
  }, []);

  const setToken = useCallback((t: string) => {
    saveToken(t);
    setTokenState(t);
  }, []);

  const setWorkspace = useCallback((w: Workspace) => {
    saveWorkspace(w);
    setWorkspaceState(w);
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
      if (e instanceof ApiError) {
        setEnvError(e.message);
      } else {
        setEnvError("Failed to load environments.");
      }
      setEnvironments({});
    } finally {
      setLoadingEnvs(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void refreshEnvironments();
    }
  }, [token, refreshEnvironments]);

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
