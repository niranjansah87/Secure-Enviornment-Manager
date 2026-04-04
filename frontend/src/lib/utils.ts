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

export type Workspace = { namespace: string; environment: string };

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

export function loadToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
