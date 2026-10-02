"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { History, Search, Boxes, Clock, GitBranch, RotateCcw, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError, type SecretMeta, type SecretVersion } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";
import { formatIso, cn } from "@/lib/utils";

const CHANGE_DOT: Record<string, string> = {
  create: "bg-emerald-400",
  update: "bg-blue-400",
  restore: "bg-violet-400",
  delete: "bg-red-400",
};

export default function HistoryPage({ params }: { params: Promise<{ namespace: string; environment: string }> }) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes } = useWorkspace();
  const { projectId, envId, loading: resolving, error: resolveError } = useResolvedWorkspace(projectSlug, envSlug);
  const canWrite = isAdmin || scopes.includes("secrets:write");

  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SecretMeta | null>(null);
  const [versions, setVersions] = useState<SecretVersion[] | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId || !envId) return;
    setLoadingSecrets(true);
    void call((t) => sem.listSecrets(t, projectId, envId))
      .then((list) => {
        setSecrets(list);
        setSelected((cur) => cur ?? list[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingSecrets(false));
  }, [projectId, envId, call]);

  const loadVersions = useCallback(
    async (secret: SecretMeta) => {
      if (!projectId || !envId) return;
      setLoadingVersions(true);
      setVersions(null);
      try {
        const v = await call((t) => sem.listVersions(t, projectId, envId, secret.key));
        setVersions(v);
      } catch {
        setVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    },
    [call, projectId, envId],
  );

  useEffect(() => {
    if (selected) void loadVersions(selected);
  }, [selected, loadVersions]);

  const rollback = async (v: number) => {
    if (!selected || !projectId || !envId) return;
    setRolling(v);
    try {
      await call((t) => sem.rollbackSecret(t, projectId, envId, selected.key, v));
      toast.success(`Restored ${selected.key} to v${v}`);
      await loadVersions(selected);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Restore failed");
    } finally {
      setRolling(null);
    }
  };

  const filtered = useMemo(() => secrets.filter((s) => s.key.toLowerCase().includes(query.toLowerCase())), [secrets, query]);

  if (resolveError) {
    return <EmptyState icon={Boxes} title={resolveError} description="This environment doesn't exist or you lack access." actionLabel="Back to projects" actionHref="/projects" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <History className="h-3.5 w-3.5" /> {projectSlug} / {envSlug} / History
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Version history</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Track every change to your secrets. Compare versions and restore previous values.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Secret picker */}
        <Card className="flex max-h-[640px] flex-col p-0">
          <div className="border-b border-white/5 p-4">
            <p className="mb-2 text-sm font-semibold text-zinc-100">Secrets</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search secrets…" className="pl-9 h-9 bg-black/40 border-white/8" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingSecrets || resolving ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/5" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-600">No secrets.</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={cn("mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors", selected?.id === s.id ? "bg-white/8" : "hover:bg-white/5")}
                >
                  <KeyRound className="h-3.5 w-3.5 shrink-0 text-violet-400/70" />
                  <span className="truncate font-mono text-xs text-zinc-200">{s.key}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-zinc-600">v{s.version}</span>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Timeline */}
        <div className="space-y-4">
          {!selected ? (
            <EmptyState icon={History} title="Select a secret" description="Choose a secret to view its full version history and restore earlier values." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SmallStat icon={GitBranch} label="Total versions" value={versions ? String(versions.length) : "—"} />
                <SmallStat icon={Clock} label="Last updated" value={formatIso(selected.updated_at)} />
                <SmallStat icon={Boxes} label="Created" value={formatIso(selected.created_at)} />
              </div>

              <Card className="p-5">
                <div className="mb-4">
                  <p className="font-mono text-sm font-semibold text-zinc-100">{selected.key}</p>
                  <p className="text-xs text-zinc-500">Version history and change log for this secret.</p>
                </div>
                {loadingVersions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />)}
                  </div>
                ) : !versions || versions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-600">No version history.</p>
                ) : (
                  <ol className="relative space-y-1 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/8">
                    {versions.map((v) => (
                      <motion.li
                        key={v.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative flex items-center gap-4 rounded-lg px-2 py-2.5 hover:bg-white/[0.02]"
                      >
                        <span className={cn("z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-[#0c111d]", CHANGE_DOT[v.change_type] ?? "bg-zinc-500")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-200">
                            v{v.version}
                            <span className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{v.change_type}</span>
                            {v.version === selected.version && <span className="ml-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">Current</span>}
                          </p>
                          <p className="text-[11px] text-zinc-500">{formatIso(v.created_at)}</p>
                        </div>
                        {canWrite && v.change_type !== "delete" && v.version !== selected.version && (
                          <Button variant="outline" size="sm" className="h-7 shrink-0 border-white/10 text-xs" disabled={rolling !== null} onClick={() => void rollback(v.version)}>
                            {rolling === v.version ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            Restore
                          </Button>
                        )}
                      </motion.li>
                    ))}
                  </ol>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">{value}</p>
        <p className="truncate text-[11px] text-zinc-500">{label}</p>
      </div>
    </Card>
  );
}
