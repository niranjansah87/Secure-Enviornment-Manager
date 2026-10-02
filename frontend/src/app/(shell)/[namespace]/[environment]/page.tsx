"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ShieldCheck,
  Boxes,
  Clock,
  Search,
  Plus,
  FileUp,
  Download,
  Eye,
  EyeOff,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Flame,
  Type as TypeIcon,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError, type SecretMeta, type SecretVersion, type Environment, type ExportFormat } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SecretDialog } from "@/components/modals/secret-dialog";
import { BulkImportDialog } from "@/components/modals/bulk-import-dialog";
import { EmptyState } from "@/components/forms/empty-state";
import { envDotClass, envBadgeClass } from "@/lib/env-style";
import { formatIso, maskValue, cn } from "@/lib/utils";

const AUTO_HIDE_MS = 15000;

export default function SecretsPage({ params }: { params: Promise<{ namespace: string; environment: string }> }) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes, selectWorkspace } = useWorkspace();
  const router = useRouter();
  const { project, environment, projectId, envId, loading: resolving, error: resolveError } = useResolvedWorkspace(projectSlug, envSlug);

  const canWrite = isAdmin || scopes.includes("secrets:write");
  const canDelete = isAdmin || scopes.includes("secrets:delete");
  const canReveal = isAdmin || scopes.includes("secrets:read");
  const canExport = isAdmin || scopes.includes("secrets:export");

  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "secret" | "text">("all");

  const [envs, setEnvs] = useState<Environment[]>([]);
  const [envCounts, setEnvCounts] = useState<Record<string, number>>({});

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SecretMeta | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SecretMeta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<SecretMeta | null>(null);

  const loadSecrets = useCallback(async () => {
    if (!projectId || !envId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await call((t) => sem.listSecrets(t, projectId, envId));
      setSecrets(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  }, [call, projectId, envId]);

  useEffect(() => {
    void loadSecrets();
  }, [loadSecrets]);

  // Load sibling environments for the pill row + their counts.
  useEffect(() => {
    if (!project) return;
    let active = true;
    void call((t) => sem.listEnvironments(t, project.id))
      .then((list) => {
        if (!active) return;
        setEnvs(list);
        // Lazily count secrets per env.
        list.forEach((e) => {
          void call((t) => sem.listSecrets(t, project.id, e.id))
            .then((s) => active && setEnvCounts((prev) => ({ ...prev, [e.id]: s.length })))
            .catch(() => {});
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [project, call]);

  // Clear revealed values on tab blur, and all timers on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        Object.values(timers.current).forEach(clearTimeout);
        timers.current = {};
        setRevealed({});
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const hide = useCallback((key: string) => {
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const reveal = useCallback(
    async (key: string) => {
      if (revealed[key] !== undefined) {
        hide(key);
        return;
      }
      if (!projectId || !envId) return;
      setRevealing((p) => ({ ...p, [key]: true }));
      try {
        const { value } = await call((t) => sem.getSecretValue(t, projectId, envId, key));
        setRevealed((p) => ({ ...p, [key]: value }));
        timers.current[key] = setTimeout(() => hide(key), AUTO_HIDE_MS);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not reveal value");
      } finally {
        setRevealing((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
    },
    [revealed, hide, call, projectId, envId],
  );

  const copyValue = useCallback(
    async (key: string) => {
      if (!projectId || !envId) return;
      try {
        const value = revealed[key] ?? (await call((t) => sem.getSecretValue(t, projectId, envId, key))).value;
        await navigator.clipboard.writeText(value);
        toast.success(`Copied ${key}`, { description: "Clipboard clears in 30s." });
        setTimeout(() => {
          navigator.clipboard.writeText("").catch(() => {});
        }, 30000);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not copy value");
      }
    },
    [revealed, call, projectId, envId],
  );

  async function confirmDelete() {
    if (!deleteTarget || !projectId || !envId) return;
    setDeleting(true);
    try {
      await call((t) => sem.deleteSecret(t, projectId, envId, deleteTarget.key));
      toast.success(`Deleted ${deleteTarget.key}`);
      setDeleteTarget(null);
      setDetail(null);
      void loadSecrets();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function doExport(format: ExportFormat) {
    if (!projectId || !envId || !project || !environment) return;
    try {
      const { content } = await call((t) => sem.exportSecrets(t, projectId, envId, format));
      const ext = format === "json" ? "json" : format === "docker" ? "txt" : "env";
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.slug}-${environment.slug}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  }

  const filtered = useMemo(
    () =>
      secrets.filter((s) => {
        if (typeFilter === "secret" && !s.is_sensitive) return false;
        if (typeFilter === "text" && s.is_sensitive) return false;
        const q = query.toLowerCase();
        return !q || s.key.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      }),
    [secrets, query, typeFilter],
  );

  const updatedToday = useMemo(() => {
    const today = new Date().toDateString();
    return secrets.filter((s) => new Date(s.updated_at).toDateString() === today).length;
  }, [secrets]);

  if (resolveError) {
    return (
      <EmptyState
        icon={Boxes}
        title={resolveError}
        description="This project or environment doesn't exist or you don't have access."
        actionLabel="Back to projects"
        actionHref="/projects"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <span>Projects</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">{projectSlug}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300">Secrets</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Secrets</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
          Manage sensitive information for your environments. Store, search, and organize your secrets securely.
        </p>
      </div>

      {/* Environment pills */}
      <div className="flex flex-wrap gap-3">
        {envs.map((e) => {
          const active = e.slug === envSlug;
          return (
            <button
              key={e.id}
              onClick={() => {
                selectWorkspace(projectSlug, e.slug);
                router.push(`/${projectSlug}/${e.slug}`);
              }}
              className={cn(
                "flex min-w-[150px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                active ? "border-violet-500/50 bg-violet-500/10" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shadow-[0_0_6px]", envDotClass(e.slug))} />
              <div>
                <p className="text-sm font-medium capitalize text-zinc-100">{e.name}</p>
                <p className="text-xs text-zinc-500">{envCounts[e.id] ?? "—"} secrets</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={KeyRound} label="Total secrets" value={loading ? "—" : String(secrets.length)} tint="violet" />
        <MiniStat icon={ShieldCheck} label="Encrypted" value="100%" hint="AES-256-GCM" tint="emerald" />
        <MiniStat icon={Boxes} label="Environments" value={String(envs.length || "—")} tint="blue" />
        <MiniStat icon={Clock} label="Updated today" value={loading ? "—" : String(updatedToday)} tint="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search secrets…" className="pl-9 bg-white/[0.03] border-white/8" aria-label="Search secrets" />
          </div>
          <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5 text-xs">
            {(["all", "text", "secret"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn("rounded-md px-3 py-1.5 font-medium capitalize transition-colors", typeFilter === t ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-white/8" disabled={secrets.length === 0}>
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                <DropdownMenuItem onSelect={() => void doExport("env")} className="text-xs cursor-pointer">.env file</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void doExport("json")} className="text-xs cursor-pointer">JSON</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void doExport("docker")} className="text-xs cursor-pointer">Docker --env flags</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canWrite && (
            <>
              <Button variant="outline" size="sm" className="border-violet-500/20 bg-violet-500/5 text-violet-300 hidden md:flex" onClick={() => setBulkOpen(true)}>
                <FileUp className="h-4 w-4" /> Bulk import
              </Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Add secret
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {loading || resolving ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void loadSecrets()}>Retry</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={query || typeFilter !== "all" ? "No matching secrets" : "No secrets yet"}
          description={query || typeFilter !== "all" ? "Try adjusting your search or filter." : "Add your first secret or bulk-import a .env file."}
          actionLabel={canWrite && !query && typeFilter === "all" ? "Add secret" : undefined}
          onAction={canWrite ? () => { setEditing(null); setDialogOpen(true); } : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map((s) => {
                  const isRevealed = revealed[s.key] !== undefined;
                  return (
                    <tr key={s.id} className="group cursor-pointer transition-colors hover:bg-white/[0.02]" onClick={() => setDetail(s)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                            {s.is_sensitive ? <Flame className="h-4 w-4 text-amber-400/80" /> : <TypeIcon className="h-4 w-4 text-blue-400/80" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-zinc-100">{s.key}</p>
                            {s.description && <p className="truncate text-[11px] text-zinc-500">{s.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", s.is_sensitive ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400")}>
                          {s.is_sensitive ? "Secret" : "Text"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", envBadgeClass(envSlug))}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", envDotClass(envSlug))} />
                          {envSlug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {formatIso(s.updated_at)}
                        <span className="block text-[10px] text-zinc-600">v{s.version}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {canReveal && (
                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", isRevealed ? "text-emerald-400" : "text-zinc-500 hover:text-white")} onClick={() => void reveal(s.key)} aria-label={isRevealed ? "Hide value" : "Reveal value"}>
                              {revealing[s.key] ? <Loader2 className="h-4 w-4 animate-spin" /> : isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                          {canReveal && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-white" onClick={() => void copyValue(s.key)} aria-label="Copy value">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {(canWrite || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-500 hover:text-white" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 bg-zinc-900 border-white/10">
                                {canWrite && (
                                  <DropdownMenuItem className="text-xs cursor-pointer" onSelect={() => { setEditing(s); setDialogOpen(true); }}>
                                    <Pencil className="mr-2 h-3.5 w-3.5 text-zinc-500" /> Edit secret
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem className="text-xs cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10" onSelect={() => setDeleteTarget(s)}>
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        {isRevealed && (
                          <p className="mt-1 max-w-[220px] truncate text-right font-mono text-[10px] text-emerald-400/80">{maskValue(revealed[s.key], true)}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && projectId && envId && (
          <SecretDrawer
            key={detail.id}
            secret={detail}
            projectSlug={projectSlug}
            envSlug={envSlug}
            projectId={projectId}
            envId={envId}
            canWrite={canWrite}
            canDelete={canDelete}
            canReveal={canReveal}
            onClose={() => setDetail(null)}
            onEdit={() => { setEditing(detail); setDialogOpen(true); }}
            onDelete={() => setDeleteTarget(detail)}
            onChanged={() => void loadSecrets()}
          />
        )}
      </AnimatePresence>

      {/* Dialogs */}
      {projectId && envId && (
        <>
          <SecretDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} environmentId={envId} editing={editing} onSaved={() => void loadSecrets()} />
          <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} projectId={projectId} environmentId={envId} existingKeys={secrets.map((s) => s.key)} onApplied={() => void loadSecrets()} />
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Permanently remove <code className="rounded bg-violet-400/10 px-1 text-violet-400">{deleteTarget?.key}</code>. This is recorded in the audit log and version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500" disabled={deleting} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string; tint: "violet" | "emerald" | "blue" | "amber" }) {
  const tints: Record<string, string> = {
    violet: "bg-violet-600/15 text-violet-400",
    emerald: "bg-emerald-600/15 text-emerald-400",
    blue: "bg-blue-600/15 text-blue-400",
    amber: "bg-amber-600/15 text-amber-400",
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tints[tint])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-zinc-100">{value}</p>
        <p className="truncate text-[11px] text-zinc-500">{hint ?? label}</p>
      </div>
    </Card>
  );
}

function SecretDrawer({
  secret,
  projectSlug,
  envSlug,
  projectId,
  envId,
  canWrite,
  canDelete,
  canReveal,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: {
  secret: SecretMeta;
  projectSlug: string;
  envSlug: string;
  projectId: string;
  envId: string;
  canWrite: boolean;
  canDelete: boolean;
  canReveal: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const { call } = useWorkspace();
  const [tab, setTab] = useState<"details" | "versions">("details");
  const [value, setValue] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [loadingValue, setLoadingValue] = useState(false);
  const [versions, setVersions] = useState<SecretVersion[] | null>(null);
  const [rolling, setRolling] = useState<number | null>(null);

  const revealValue = async () => {
    if (value !== null) {
      setShowValue((s) => !s);
      return;
    }
    setLoadingValue(true);
    try {
      const r = await call((t) => sem.getSecretValue(t, projectId, envId, secret.key));
      setValue(r.value);
      setShowValue(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not reveal value");
    } finally {
      setLoadingValue(false);
    }
  };

  useEffect(() => {
    if (tab === "versions" && versions === null) {
      void call((t) => sem.listVersions(t, projectId, envId, secret.key))
        .then(setVersions)
        .catch(() => setVersions([]));
    }
  }, [tab, versions, call, projectId, envId, secret.key]);

  const rollback = async (v: number) => {
    setRolling(v);
    try {
      await call((t) => sem.rollbackSecret(t, projectId, envId, secret.key, v));
      toast.success(`Rolled back ${secret.key} to v${v}`);
      setVersions(null);
      setValue(null);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Rollback failed");
    } finally {
      setRolling(null);
    }
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c111d] shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between border-b border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              {secret.is_sensitive ? <Flame className="h-5 w-5 text-amber-400/80" /> : <TypeIcon className="h-5 w-5 text-blue-400/80" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-zinc-100">{secret.key}</p>
              <p className="text-xs text-zinc-500">{secret.is_sensitive ? "Secret" : "Text"} · v{secret.version}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 border-b border-white/5 px-4">
          {(["details", "versions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("relative px-3 py-2.5 text-xs font-medium capitalize", tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300")}>
              {t}
              {tab === t && <motion.div layoutId="drawer-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-violet-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "details" ? (
            <div className="space-y-4 text-sm">
              <DetailRow label="Type" value={secret.is_sensitive ? "Secret" : "Text"} />
              <DetailRow label="Environment" value={`${projectSlug} / ${envSlug}`} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Value</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-white/5 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300">
                    {value !== null && showValue ? value : "••••••••••••"}
                  </code>
                  {canReveal && (
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 border-white/10" onClick={() => void revealValue()} aria-label="Reveal value">
                      {loadingValue ? <Loader2 className="h-4 w-4 animate-spin" /> : showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              {secret.description && <DetailRow label="Description" value={secret.description} />}
              <DetailRow label="Created" value={formatIso(secret.created_at)} />
              <DetailRow label="Last updated" value={formatIso(secret.updated_at)} />
            </div>
          ) : (
            <div className="space-y-2">
              {versions === null ? (
                <Skeleton className="h-24 w-full rounded-lg bg-white/5" />
              ) : versions.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No version history.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <div>
                      <p className="text-sm text-zinc-200">
                        v{v.version} <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-500">{v.change_type}</span>
                      </p>
                      <p className="text-[11px] text-zinc-500">{formatIso(v.created_at)}</p>
                    </div>
                    {canWrite && v.change_type !== "delete" && v.version !== secret.version && (
                      <Button variant="outline" size="sm" className="h-7 border-white/10 text-xs" disabled={rolling !== null} onClick={() => void rollback(v.version)}>
                        {rolling === v.version ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        Restore
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {(canWrite || canDelete) && (
          <div className="flex gap-2 border-t border-white/5 p-4">
            {canWrite && (
              <Button variant="outline" className="flex-1 border-white/10" onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </motion.aside>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-zinc-200">{value}</p>
    </div>
  );
}
