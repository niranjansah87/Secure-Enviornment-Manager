"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  KeyRound,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type Environment } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { envDotClass } from "@/lib/env-style";
import { cn, maskValue } from "@/lib/utils";

type Status = "added" | "removed" | "modified" | "unchanged";

type DiffRow = {
  key: string;
  source: string | null;
  target: string | null;
  status: Status;
};

function buildDiff(src: Record<string, string>, tgt: Record<string, string>): DiffRow[] {
  const allKeys = Array.from(new Set([...Object.keys(src), ...Object.keys(tgt)])).sort();
  return allKeys.map((key) => {
    const s = src[key];
    const t = tgt[key];
    if (s === undefined && t !== undefined) return { key, source: null, target: t, status: "added" };
    if (s !== undefined && t === undefined) return { key, source: s, target: null, status: "removed" };
    if (s !== t) return { key, source: s, target: t, status: "modified" };
    return { key, source: s, target: t, status: "unchanged" };
  });
}

export default function ComparePage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { projects, environmentsFor, call } = useWorkspace();
  const project = projects.find((p) => p.slug === projectSlug) ?? null;

  const [compareMode, setCompareMode] = useState<"environments" | "versions" | "keys">("environments");
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [source, setSource] = useState<string>("staging");
  const [target, setTarget] = useState<string>(envSlug);
  const [rows, setRows] = useState<DiffRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reveal, setReveal] = useState(false);

  const base = `/${projectSlug}/${envSlug}`;

  useEffect(() => {
    if (!project) return;
    void environmentsFor(project.id).then((list) => {
      setEnvs(list);
      if (!source || source === envSlug) {
        const other = list.find((e) => e.slug !== envSlug);
        if (other) setSource(other.slug);
      }
    });
  }, [project, environmentsFor, envSlug, source]);

  const runCompare = useCallback(async () => {
    if (!source || !target || source === target) {
      // Mock demo data if only 1 env exists
      const demoSrc: Record<string, string> = {
        DATABASE_URL: "postgres://user:pass@staging-db:5432/sem_staging\nDB_HOST=staging-db.internal\nDB_PORT=5432\nDB_NAME=sem_staging\nDB_USER=sem_user\nDB_PASSWORD=staging_password_123\nDB_POOL_SIZE=10\nDB_SSL=false\nDB_SCHEMA=public\nDB_TIMEOUT=30\nDB_LOGGING=true",
        REDIS_URL: "redis://default:s3cr3t@staging-cache:6379",
        AWS_ACCESS_KEY_ID: "AKIA_STAGING_KEY",
        AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        NEXT_PUBLIC_API_URL: "https://staging-api.example.com",
        STRIPE_SECRET_KEY: "sk_test_51Mz...",
        SENTRY_DSN: "https://staging@sentry.io/123",
        OPENAI_API_KEY: "sk-proj-staging-...",
      };
      const demoTgt: Record<string, string> = {
        DATABASE_URL: "postgres://user:pass@prod-db:5432/sem_prod\nDB_HOST=prod-db.internal\nDB_PORT=5432\nDB_NAME=sem_prod\nDB_USER=sem_user\nDB_PASSWORD=${DB_PASSWORD}\nDB_POOL_SIZE=20\nDB_SSL=true\nDB_SCHEMA=public\nDB_TIMEOUT=30\nDB_LOGGING=false",
        REDIS_URL: "redis://default:prod_s3cr3t@prod-cache:6379",
        JWT_SECRET: "prod_jwt_super_secret_signing_key_991823",
        AWS_ACCESS_KEY_ID: "AKIA_PROD_KEY",
        AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYPROD_KEY",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        STRIPE_SECRET_KEY: "sk_live_51Mz...",
        OPENAI_API_KEY: "sk-proj-prod-...",
      };
      setRows(buildDiff(demoSrc, demoTgt));
      setSelectedKey("DATABASE_URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [src, tgt] = await Promise.all([
        call((t) => sem.remoteConfig(t, projectSlug, source)),
        call((t) => sem.remoteConfig(t, projectSlug, target)),
      ]);
      const diff = buildDiff(src, tgt);
      setRows(diff);
      setSelectedKey(diff[0]?.key ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to compare environments");
    } finally {
      setLoading(false);
    }
  }, [source, target, projectSlug, call]);

  useEffect(() => {
    void runCompare();
  }, [runCompare]);

  const swap = () => {
    const s = source;
    setSource(target);
    setTarget(s);
  };

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => r.key.toLowerCase().includes(q));
  }, [rows, query]);

  const selectedRow = useMemo(() => {
    if (!rows || !selectedKey) return null;
    return rows.find((r) => r.key === selectedKey) ?? rows[0];
  }, [rows, selectedKey]);

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching compare.png) */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">{projectSlug}</Link>
              <span>/</span>
              <span className="text-blue-400">Compare</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Compare</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1">
              Find configuration differences between environments, versions, or timepoints.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 p-3 rounded-2xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md">
            <div className="h-8 w-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Compare anything</p>
              <p className="text-[11px] text-zinc-400">Environments, secrets, or specific keys</p>
            </div>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Mode Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "environments", title: "Environments", desc: "Compare between environments", icon: Boxes },
          { id: "versions", title: "Versions", desc: "Compare historical changes", icon: Clock },
          { id: "keys", title: "Specific keys", desc: "Compare selected secrets", icon: KeyRound },
        ].map((m) => {
          const Icon = m.icon;
          const active = compareMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setCompareMode(m.id as "environments" | "versions" | "keys")}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5",
                active
                  ? "bg-blue-600/15 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "bg-[#0c101a]/70 border-white/[0.08] hover:bg-[#121724]"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                  active
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                    : "bg-white/[0.04] border-white/[0.08] text-zinc-400"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{m.title}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Configuration Selectors Bar (Source, Target, Swap, Filter, CTA) */}
      <div className="glass-panel rounded-2xl p-4.5 border border-white/[0.08] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Source Environment Dropdown */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.08] bg-[#07090e] min-w-[200px]">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-sm" />
            <div className="flex-1 text-left">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Source</p>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none w-full capitalize"
              >
                {envs.map((e) => (
                  <option key={e.id} value={e.slug} className="bg-[#0c101a] text-white">
                    {e.name}
                  </option>
                ))}
                {envs.length === 0 && <option value="staging">Staging</option>}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <motion.button
            whileTap={{ rotate: 180, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={swap}
            className="p-2.5 rounded-xl border border-white/[0.08] bg-[#07090e] hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors shadow-sm"
            title="Swap source and target"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </motion.button>

          {/* Target Environment Dropdown */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.08] bg-[#07090e] min-w-[200px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm" />
            <div className="flex-1 text-left">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Target</p>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none w-full capitalize"
              >
                {envs.map((e) => (
                  <option key={e.id} value={e.slug} className="bg-[#0c101a] text-white">
                    {e.name}
                  </option>
                ))}
                {envs.length === 0 && <option value="production">Production</option>}
              </select>
            </div>
          </div>

          {/* Filter secrets input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter secrets or use tags..."
              className="pl-9 h-10 bg-[#07090e] border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 rounded-xl"
            />
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => void runCompare()}
          className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Compare</span>
        </Button>
      </div>

      {/* 4. Metric Cards (Total, Added, Modified, Removed) */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white tabular-nums">{filteredRows.length || 24}</p>
            <p className="text-[11px] text-zinc-400">Total secrets</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-400 tabular-nums">
              {filteredRows.filter((r) => r.status === "added").length || 12}
            </p>
            <p className="text-[11px] text-zinc-400">Added in {target}</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-400 tabular-nums">
              {filteredRows.filter((r) => r.status === "modified").length || 8}
            </p>
            <p className="text-[11px] text-zinc-400">Modified</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-red-400 tabular-nums">
              {filteredRows.filter((r) => r.status === "removed").length || 4}
            </p>
            <p className="text-[11px] text-zinc-400">Removed from {target}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 5. Main Split View: Left Secrets List, Right Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Secrets List (Col 4) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Secrets ({filteredRows.length})</span>
            <button
              onClick={() => setReveal((r) => !r)}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{reveal ? "Mask values" : "Reveal values"}</span>
            </button>
          </div>

          <div className="divide-y divide-white/[0.05] max-h-[560px] overflow-y-auto">
            {filteredRows.map((r) => {
              const isSelected = selectedKey === r.key;
              return (
                <div
                  key={r.key}
                  onClick={() => setSelectedKey(r.key)}
                  className={cn(
                    "p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 text-xs",
                    isSelected
                      ? "bg-blue-600/15 border-l-2 border-l-blue-500"
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-zinc-200 truncate">{r.key}</p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">PostgreSQL connection string</p>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase shrink-0",
                      r.status === "added"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : r.status === "modified"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : r.status === "removed"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-white/[0.05] text-zinc-500"
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Diff Box & Summary (Col 8) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-white/[0.08] p-6 space-y-6">
          {/* Diff Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">{selectedRow?.key}</h3>
                <p className="text-xs text-zinc-400">PostgreSQL connection string</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left sm:text-right text-xs">
                <p className="text-zinc-500 text-[10px]">Last updated</p>
                <p className="text-zinc-300">2 hours ago by Niranjan Sah</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 px-3 rounded-xl border-white/[0.1] bg-[#0c101a] text-xs text-zinc-200 hover:text-white"
              >
                <Link href={`${base}/history`}>
                  <Clock className="h-3.5 w-3.5 mr-1 text-zinc-400" /> View history
                </Link>
              </Button>
            </div>
          </div>

          {/* Side-by-Side Diff Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Left Box: Source (Staging) */}
            <div className="rounded-xl border border-white/[0.08] bg-[#07090e] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-white/[0.06]">
                <span className="flex items-center gap-1.5 font-sans font-semibold text-zinc-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="capitalize">{source}</span> (current)
                </span>
                <span className="text-[11px] text-zinc-500">12 lines</span>
              </div>
              <pre className="text-zinc-400 leading-relaxed overflow-x-auto text-[11px]">
                {selectedRow?.source ? (
                  reveal ? (
                    selectedRow.source
                  ) : (
                    selectedRow.source.replace(/pass@.*?\//g, "pass@••••••••/")
                  )
                ) : (
                  <span className="text-zinc-600 italic">Key does not exist in {source}</span>
                )}
              </pre>
            </div>

            {/* Right Box: Target (Production) */}
            <div className="rounded-xl border border-white/[0.08] bg-[#07090e] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-white/[0.06]">
                <span className="flex items-center gap-1.5 font-sans font-semibold text-zinc-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="capitalize">{target}</span> (current)
                </span>
                <span className="text-[11px] text-zinc-500">12 lines</span>
              </div>
              <pre className="text-emerald-400/90 leading-relaxed overflow-x-auto text-[11px]">
                {selectedRow?.target ? (
                  reveal ? (
                    selectedRow.target
                  ) : (
                    selectedRow.target.replace(/pass@.*?\//g, "pass@••••••••/")
                  )
                ) : (
                  <span className="text-zinc-600 italic">Key does not exist in {target}</span>
                )}
              </pre>
            </div>
          </div>

          {/* Changes Summary Card */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#07090e] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Changes summary</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ↑
                </span>
                <div>
                  <span className="text-zinc-300 font-medium">Added in {target}: </span>
                  <span className="font-mono text-zinc-400">DB_POOL_SIZE, DB_SSL</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ●
                </span>
                <div>
                  <span className="text-zinc-300 font-medium">Modified: </span>
                  <span className="font-mono text-zinc-400">DATABASE_URL, DB_PASSWORD, DB_LOGGING</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
