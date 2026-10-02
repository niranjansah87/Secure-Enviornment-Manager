"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GitCompare,
  ArrowLeftRight,
  Boxes,
  Plus,
  Trash2,
  Pencil,
  Search,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type Environment } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/forms/empty-state";
import { envDotClass } from "@/lib/env-style";
import { cn, maskValue } from "@/lib/utils";

type Status = "added" | "removed" | "modified" | "unchanged";

type DiffRow = {
  key: string;
  source: string | null;
  target: string | null;
  status: Status;
};

const STATUS_STYLE: Record<Status, string> = {
  added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  removed: "border-red-500/30 bg-red-500/10 text-red-400",
  modified: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  unchanged: "border-white/10 bg-white/5 text-zinc-500",
};

export default function ComparePage({ params }: { params: Promise<{ namespace: string; environment: string }> }) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { projects, environmentsFor, call } = useWorkspace();
  const project = projects.find((p) => p.slug === projectSlug) ?? null;

  const [envs, setEnvs] = useState<Environment[]>([]);
  const [source, setSource] = useState<string>("");
  const [target, setTarget] = useState<string>(envSlug);
  const [rows, setRows] = useState<DiffRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!project) return;
    void environmentsFor(project.id).then((list) => {
      setEnvs(list);
      if (!source) {
        const other = list.find((e) => e.slug !== envSlug);
        if (other) setSource(other.slug);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const runCompareAuthed = useCallback(async () => {
    if (!source || !target || source === target) {
      setError("Pick two different environments.");
      return;
    }
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const [src, tgt] = await Promise.all([
        call((t) => sem.remoteConfig(t, projectSlug, source)),
        call((t) => sem.remoteConfig(t, projectSlug, target)),
      ]);
      setRows(buildDiff(src, tgt));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to compare environments");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [source, target, projectSlug, call]);

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      total: rows.filter((r) => r.target !== null).length,
      added: rows.filter((r) => r.status === "added").length,
      modified: rows.filter((r) => r.status === "modified").length,
      removed: rows.filter((r) => r.status === "removed").length,
    };
  }, [rows]);

  const filtered = useMemo(() => (rows ?? []).filter((r) => r.key.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const selectedRow = filtered.find((r) => r.key === selected) ?? rows?.find((r) => r.key === selected) ?? null;

  if (!project) {
    return <EmptyState icon={Boxes} title="Project not found" description="This project doesn't exist or you lack access." actionLabel="Back to projects" actionHref="/projects" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <GitCompare className="h-3.5 w-3.5" /> {projectSlug} / Compare
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Compare</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Find configuration differences between environments.</p>
      </div>

      {/* Selectors */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <EnvSelect label="Source environment" value={source} envs={envs} onChange={setSource} />
          <Button variant="outline" size="icon" className="mb-0.5 shrink-0 border-white/10" onClick={() => { const s = source; setSource(target); setTarget(s); }} aria-label="Swap environments">
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <EnvSelect label="Target environment" value={target} envs={envs} onChange={setTarget} />
          <Button className="mb-0.5 bg-violet-600 hover:bg-violet-500" onClick={() => void runCompareAuthed()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </Button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </Card>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DiffStat icon={Boxes} label="Total secrets" value={stats.total} tint="text-blue-400 bg-blue-500/10" />
          <DiffStat icon={Plus} label={`Added in ${target}`} value={stats.added} tint="text-emerald-400 bg-emerald-500/10" />
          <DiffStat icon={Pencil} label="Modified" value={stats.modified} tint="text-amber-400 bg-amber-500/10" />
          <DiffStat icon={Trash2} label={`Removed from ${target}`} value={stats.removed} tint="text-red-400 bg-red-500/10" />
        </div>
      )}

      {rows && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Key list */}
          <Card className="flex max-h-[600px] flex-col p-0">
            <div className="border-b border-white/5 p-4">
              <p className="mb-2 text-sm font-semibold text-zinc-100">Secrets ({rows.length})</p>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search secrets…" className="pl-9 bg-black/40 border-white/8 h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No secrets.</p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setSelected(r.key)}
                    className={cn("mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors", selected === r.key ? "bg-white/8" : "hover:bg-white/5")}
                  >
                    <span className="truncate font-mono text-xs text-zinc-200">{r.key}</span>
                    <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[r.status])}>{r.status}</span>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Diff view */}
          <Card className="p-5">
            {!selectedRow ? (
              <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-zinc-600">Select a secret to see the difference.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-zinc-100">{selectedRow.key}</p>
                    <span className={cn("mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[selectedRow.status])}>{selectedRow.status}</span>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10" onClick={() => setReveal((r) => !r)}>
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {reveal ? "Mask" : "Reveal"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DiffPane title={source} tone={selectedRow.status === "added" ? "muted" : "red"} value={selectedRow.source} reveal={reveal} />
                  <DiffPane title={target} tone={selectedRow.status === "removed" ? "muted" : "green"} value={selectedRow.target} reveal={reveal} />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {!rows && !loading && (
        <EmptyState icon={GitCompare} title="Compare two environments" description="Choose a source and target environment above, then run the comparison to see what changed." />
      )}
    </div>
  );
}

function buildDiff(src: Record<string, string>, tgt: Record<string, string>): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(src), ...Object.keys(tgt)])).sort();
  return keys.map((key) => {
    const s = key in src ? src[key] : null;
    const t = key in tgt ? tgt[key] : null;
    let status: Status;
    if (s === null && t !== null) status = "added";
    else if (s !== null && t === null) status = "removed";
    else if (s !== t) status = "modified";
    else status = "unchanged";
    return { key, source: s, target: t, status };
  });
}

function EnvSelect({ label, value, envs, onChange }: { label: string; value: string; envs: Environment[]; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 space-y-1.5">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="relative">
        <span className={cn("absolute left-3 top-3 h-2 w-2 rounded-full", envDotClass(value))} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-white/8 bg-black/40 pl-8 pr-8 text-sm capitalize text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          <option value="" disabled>
            Select…
          </option>
          {envs.map((e) => (
            <option key={e.id} value={e.slug} className="bg-zinc-900">
              {e.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DiffStat({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tint: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tint)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-zinc-100">{value}</p>
        <p className="truncate text-[11px] text-zinc-500">{label}</p>
      </div>
    </Card>
  );
}

function DiffPane({ title, tone, value, reveal }: { title: string; tone: "green" | "red" | "muted"; value: string | null; reveal: boolean }) {
  const toneClass = tone === "green" ? "border-emerald-500/20" : tone === "red" ? "border-red-500/20" : "border-white/8";
  return (
    <div className={cn("rounded-xl border bg-black/30 p-3", toneClass)}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium capitalize text-zinc-300">
        <span className={cn("h-1.5 w-1.5 rounded-full", envDotClass(title))} /> {title}
      </p>
      {value === null ? (
        <p className="font-mono text-xs italic text-zinc-600">— not present —</p>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="break-all font-mono text-xs text-zinc-300">
          {maskValue(value, reveal)}
        </motion.p>
      )}
    </div>
  );
}
