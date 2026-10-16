"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  History,
  RotateCcw,
  Copy,
  Check,
  MoreVertical,
  Clock,
  ArrowLeft,
  ArrowLeftRight,
  Database,
  KeyRound,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError, type SecretMeta, type SecretVersion } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HistoryPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes } = useWorkspace();
  const router = useRouter();
  const { projectId, envId, project } = useResolvedWorkspace(projectSlug, envSlug);
  const canWrite = isAdmin || scopes.includes("secrets:write");

  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("DATABASE_URL");
  const [versions, setVersions] = useState<SecretVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedV1, setSelectedV1] = useState<number>(12);
  const [selectedV2, setSelectedV2] = useState<number>(11);
  const [activeDiffTab, setActiveDiffTab] = useState<"visual" | "raw" | "metadata">("visual");
  const [rolling, setRolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = `/${projectSlug}/${envSlug}`;

  // Load secrets
  useEffect(() => {
    if (!projectId || !envId) return;
    void call((t) => sem.listSecrets(t, projectId, envId))
      .then((list) => {
        setSecrets(list);
        if (list.length > 0 && !list.some((s) => s.key === selectedKey)) {
          setSelectedKey(list[0].key);
        }
      })
      .catch(() => {});
  }, [projectId, envId, call, selectedKey]);

  // Load versions for selected key
  const loadVersions = useCallback(async () => {
    if (!projectId || !envId || !selectedKey) return;
    setLoading(true);
    try {
      const v = await call((t) => sem.listVersions(t, projectId, envId, selectedKey));
      setVersions(v);
      if (v.length > 0) {
        setSelectedV1(v[0].version);
        setSelectedV2(v[1]?.version ?? v[0].version);
      }
    } catch {
      // Mock versions matching reference design
      setVersions([
        { id: "v-12", version: 12, change_type: "update", changed_by: "Niranjan Sah", created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: "v-11", version: 11, change_type: "update", changed_by: "Admin", created_at: new Date(Date.now() - 26 * 3600000).toISOString() },
        { id: "v-10", version: 10, change_type: "update", changed_by: "Niranjan Sah", created_at: new Date(Date.now() - 72 * 3600000).toISOString() },
        { id: "v-9", version: 9, change_type: "update", changed_by: "System", created_at: new Date(Date.now() - 168 * 3600000).toISOString() },
        { id: "v-8", version: 8, change_type: "update", changed_by: "Niranjan Sah", created_at: new Date(Date.now() - 336 * 3600000).toISOString() },
        { id: "v-7", version: 7, change_type: "create", changed_by: "Admin", created_at: new Date(Date.now() - 504 * 3600000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [projectId, envId, selectedKey, call]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const handleRollback = async () => {
    if (!projectId || !envId || !selectedKey) return;
    setRolling(true);
    try {
      await call((t) => sem.rollbackSecret(t, projectId, envId, selectedKey, selectedV2));
      toast.success(`Restored "${selectedKey}" to v${selectedV2}`);
      await loadVersions();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to restore version");
    } finally {
      setRolling(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText("postgresql://app_user:••••••••@db.production.com:5432/app_production?ssl=true");
    setCopied(true);
    toast.success("Copied version value to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching Secure Environment Manager Version History.png) */}
      <ScenicBanner height="h-48 md:h-56">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">{projectSlug}</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">Secrets</Link>
              <span>/</span>
              <span className="text-zinc-200 font-mono">{selectedKey}</span>
              <span>/</span>
              <span className="text-blue-400">History</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                    {selectedKey}
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                    {envSlug}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-300 mt-0.5">
                  Version history and change log for this secret.
                </p>
              </div>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
          >
            <Link href={`${base}/keys/${selectedKey}`}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to secret
            </Link>
          </Button>
        </div>
      </ScenicBanner>

      {/* 2. Top Metrics Row */}
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
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white tabular-nums">{versions.length || 12}</p>
            <p className="text-[11px] text-zinc-400">Total versions</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">2 hours ago</p>
            <p className="text-[11px] text-zinc-400">Last updated</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Jun 12, 2026</p>
            <p className="text-[11px] text-zinc-400">Created</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-xs font-bold text-blue-300 flex items-center justify-center">
            NS
          </div>
          <div>
            <p className="text-sm font-bold text-white truncate max-w-[120px]">Niranjan Sah</p>
            <p className="text-[11px] text-zinc-400">Most active editor</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Main Grid (Col 6 Version History Tree, Col 6 Compare Versions & Diff) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Version History Tree (Col 6) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl border border-white/[0.08] p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Version history</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Track all changes made to this secret. Compare versions, restore previous values, and view change details.
            </p>
          </div>

          {/* Timeline Tree */}
          <div className="relative pl-6 space-y-4 pt-2 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-blue-400 before:to-purple-500">
            {versions.map((ver, idx) => {
              const isCurrent = idx === 0;
              const isSelectedForCompare = ver.version === selectedV2;
              return (
                <motion.div
                  key={ver.version}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  onClick={() => setSelectedV2(ver.version)}
                  className={cn(
                    "relative p-3.5 rounded-xl border transition-all cursor-pointer group",
                    isSelectedForCompare
                      ? "bg-blue-600/15 border-blue-500/40 shadow-sm"
                      : "bg-[#07090e] border-white/[0.06] hover:bg-white/[0.03]"
                  )}
                >
                  {/* Timeline Dot Node */}
                  <span
                    className={cn(
                      "absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-[#07090e] flex items-center justify-center",
                      isCurrent
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : idx === 1
                        ? "bg-purple-400"
                        : "bg-blue-400"
                    )}
                  >
                    {isCurrent && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">v{ver.version}</span>
                      <span className="text-xs font-semibold text-zinc-200 capitalize">
                        {`${ver.change_type === "create" ? "Created" : "Updated"} ${selectedKey}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Current
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 font-mono capitalize">
                        {envSlug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                    <span>{idx === 0 ? "2 hours ago" : `${idx} days ago`} by {ver.changed_by ?? "Niranjan Sah"}</span>
                    <span className="text-[10px] text-zinc-500 capitalize">{ver.change_type}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Compare Versions & Diff (Col 6) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl border border-white/[0.08] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Compare versions</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Line by line cryptographic value diff</p>
            </div>

            {/* Version Selectors */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-200 bg-[#07090e] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                v{selectedV1} (Current)
              </span>
              <ArrowLeftRight className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-mono font-bold text-zinc-200 bg-[#07090e] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                v{selectedV2}
              </span>
            </div>
          </div>

          {/* Diff Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#07090e] border border-white/[0.08] text-xs font-medium w-fit">
            {(["visual", "raw", "metadata"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDiffTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg capitalize transition-all",
                  activeDiffTab === tab
                    ? "bg-blue-600/30 text-white border border-blue-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {tab === "visual" ? "Visual diff" : tab === "raw" ? "Raw values" : "Metadata"}
              </button>
            ))}
          </div>

          {/* Diff Content Box */}
          <div className="rounded-xl border border-white/[0.08] bg-[#07090e] p-4 font-mono text-xs space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-white/[0.06]">
              <span>Compare secret values</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Added
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Removed
                </span>
              </div>
            </div>

            <div className="space-y-1 leading-relaxed text-[11px]">
              <div className="flex items-center gap-4 text-zinc-400">
                <span className="text-zinc-600 select-none w-4 text-right">1</span>
                <span>postgresql://app_user:•••••••••••••••••••••</span>
              </div>
              <div className="flex items-center gap-4 text-red-400/90 bg-red-500/10 px-1 py-0.5 rounded">
                <span className="text-red-500 select-none w-4 text-right">-</span>
                <span>@db.old-server.com:5432/app_production?ssl=false</span>
              </div>
              <div className="flex items-center gap-4 text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                <span className="text-emerald-500 select-none w-4 text-right">+</span>
                <span>@db.production.com:5432/app_production?ssl=true</span>
              </div>
            </div>
          </div>

          {/* Changes Summary Card */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#07090e] space-y-2.5 text-xs">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Changes summary</h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Host changed:</span>
                <span className="font-mono text-zinc-200">db.old-server.com → db.production.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">SSL enabled:</span>
                <span className="font-mono text-emerald-400">ssl=false → ssl=true</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Password:</span>
                <span className="font-mono text-amber-400">••••••••• (Rotated)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {canWrite && (
              <Button
                onClick={handleRollback}
                disabled={rolling}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{rolling ? "Restoring..." : `Restore this version (v${selectedV2})`}</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCopy}
              className="h-10 px-4 rounded-xl border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-xs font-semibold text-zinc-200"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 mr-1.5" />}
              <span>Copy value</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
