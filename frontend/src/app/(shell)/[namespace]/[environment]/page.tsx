"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Search,
  Plus,
  FileUp,
  Eye,
  EyeOff,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Database,
  Globe,
  Settings,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import {
  sem,
  ApiError,
  type SecretMeta,
  type Environment,
} from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { envDotClass } from "@/lib/env-style";
import { formatIso, cn } from "@/lib/utils";

const AUTO_HIDE_MS = 15000;

type SecretWithTags = SecretMeta & { tags?: string[] };

function getSecretIcon(name: string) {
  const n = name.toUpperCase();
  if (n.includes("DB") || n.includes("DATABASE") || n.includes("POSTGRES") || n.includes("MONGO")) {
    return <Database className="h-4 w-4 text-blue-400" />;
  }
  if (n.includes("URL") || n.includes("HOST") || n.includes("ENDPOINT") || n.includes("API")) {
    return <Globe className="h-4 w-4 text-sky-400" />;
  }
  return <KeyRound className="h-4 w-4 text-indigo-400" />;
}

export default function SecretsPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes, selectWorkspace } = useWorkspace();
  const router = useRouter();
  const { project, projectId, envId } = useResolvedWorkspace(
    projectSlug,
    envSlug
  );

  const canWrite = isAdmin || scopes.includes("secrets:write");
  const canDelete = isAdmin || scopes.includes("secrets:delete");
  const canReveal = isAdmin || scopes.includes("secrets:read");

  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "secret" | "text">("all");
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [envCounts, setEnvCounts] = useState<Record<string, number>>({});

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Modals & Inspector Drawer State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SecretMeta | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SecretMeta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<SecretMeta | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "versions" | "usage" | "audit">("details");

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

  useEffect(() => {
    if (!project) return;
    let active = true;
    void call((t) => sem.listEnvironments(t, project.id))
      .then((list) => {
        if (!active) return;
        setEnvs(list);
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
    [revealed, hide, call, projectId, envId]
  );

  const copyValue = async (key: string) => {
    try {
      let val = revealed[key];
      if (val === undefined) {
        if (!projectId || !envId) return;
        const res = await call((t) => sem.getSecretValue(t, projectId, envId, key));
        val = res.value;
      }
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      toast.success(`Copied "${key}" to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy value");
    }
  };

  const revealAll = async () => {
    if (Object.keys(revealed).length > 0) {
      setRevealed({});
      return;
    }
    if (!projectId || !envId) return;
    try {
      const results = await Promise.all(
        filtered.map(async (s) => {
          try {
            const res = await call((t) => sem.getSecretValue(t, projectId, envId, s.key));
            return { key: s.key, value: res.value };
          } catch {
            return null;
          }
        })
      );
      const next: Record<string, string> = {};
      results.forEach((r) => {
        if (r) next[r.key] = r.value;
      });
      setRevealed(next);
      toast.success("Revealed secrets");
    } catch {
      toast.error("Failed to reveal secrets");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !projectId || !envId) return;
    setDeleting(true);
    try {
      await call((t) => sem.deleteSecret(t, projectId, envId, deleteTarget.key));
      toast.success(`Deleted ${deleteTarget.key}`);
      if (selectedSecret?.key === deleteTarget.key) setSelectedSecret(null);
      setDeleteTarget(null);
      await loadSecrets();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return secrets.filter((s) => {
      if (typeFilter === "secret" && !s.is_sensitive) return false;
      if (typeFilter === "text" && s.is_sensitive) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        s.key.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false) ||
        ((s as SecretWithTags).tags?.some((t: string) => t.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [secrets, query, typeFilter]);

  const base = `/${projectSlug}/${envSlug}`;

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching Reference Design) */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">
                Projects
              </Link>
              <span>/</span>
              <span className="text-zinc-200">{projectSlug}</span>
              <span>/</span>
              <span className="text-blue-400">Secrets</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {project?.name ?? projectSlug}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Active
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 mt-1">
              Manage sensitive information for your environments. Store, search, and organize your secrets securely.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
            >
              <Link href={`${base}/settings`}>
                <Settings className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                <span>Project settings</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
            >
              <Link href="/dashboard">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                <span>Open in dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Top Environment Switcher Row (Pill Cards) */}
      <div className="flex flex-wrap items-center gap-3">
        {envs.map((e) => {
          const active = e.slug === envSlug;
          const count = envCounts[e.id] ?? secrets.length;
          return (
            <button
              key={e.id}
              onClick={() => {
                selectWorkspace(projectSlug, e.slug);
                router.push(`/${projectSlug}/${e.slug}`);
              }}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all text-xs font-medium shadow-sm",
                active
                  ? "bg-blue-600/20 border-blue-500/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.25)]"
                  : "bg-[#0c101a]/70 border-white/[0.08] text-zinc-300 hover:bg-[#121724] hover:border-white/[0.15]"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0 shadow-[0_0_6px]", envDotClass(e.slug))} />
              <span className="capitalize">{e.name}</span>
              <span className="text-[11px] text-zinc-400 ml-1 font-mono font-normal">
                {count} secrets
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        {[
          { label: "Secrets", href: base, active: true },
          { label: "Variables", href: base },
          { label: "Compare", href: `${base}/compare` },
          { label: "History", href: `${base}/history` },
          { label: "Audit Logs", href: `${base}/audit` },
          { label: "Settings", href: `${base}/settings` },
        ].map((tab, idx) => (
          <Link
            key={idx}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap",
              tab.active
                ? "bg-blue-600/25 text-white border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 4. Stats Summary Cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.07 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white tabular-nums">{secrets.length}</p>
              <p className="text-xs text-zinc-400">Total secrets</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">↑ 12%</span>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/[0.08] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white">100%</p>
              <p className="text-xs text-zinc-400">Encrypted at rest</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            AES-256
          </span>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white">{envs.length || 3}</p>
              <p className="text-xs text-zinc-400">Environments</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-blue-400" />
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/[0.08] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-black text-white">12</p>
              <p className="text-xs text-zinc-400">Updated today</p>
            </div>
          </div>
          <span className="text-xs text-zinc-500">Live sync</span>
        </motion.div>
      </motion.div>

      {/* 5. Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[260px] flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search secrets by name, tag, or description..."
              className="pl-10 h-10 bg-[#0c101a] border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 rounded-xl"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "secret" | "text")}
            className="h-10 px-3 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="secret">Secret</option>
            <option value="text">Text</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="h-10 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-xs font-medium text-zinc-300"
            >
              <FileUp className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              <span>Bulk import</span>
            </Button>
          )}

          {canWrite && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add secret</span>
            </Button>
          )}
        </div>
      </div>

      {/* 6. Main Secrets Table & Flyout Drawer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Secrets Table (Takes col-span-8 if drawer open, col-span-12 if closed) */}
        <div className={selectedSecret ? "lg:col-span-8 transition-all" : "lg:col-span-12"}>
          <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#07090e]/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-10">
                      <input type="checkbox" className="rounded border-white/20 bg-black/40" />
                    </th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 min-w-[280px]">
                      <div className="flex items-center justify-between">
                        <span>Secret Value</span>
                        {canReveal && filtered.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void revealAll();
                            }}
                            className="text-[10px] text-zinc-400 hover:text-sky-300 font-mono font-normal normal-case flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08]"
                            title={Object.keys(revealed).length > 0 ? "Hide all values" : "Reveal all values"}
                          >
                            {Object.keys(revealed).length > 0 ? (
                              <>
                                <EyeOff className="h-3 w-3 text-sky-400" />
                                <span>Hide all</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                <span>Reveal all</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Last updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Loading secrets…
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-rose-400">
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-zinc-500">
                        <KeyRound className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                        <p className="text-zinc-300 font-medium">No secrets found</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {query ? "Try adjusting your search query." : "Add your first secret variable above."}
                        </p>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filtered.map((s) => {
                      const isRevealed = revealed[s.key] !== undefined;
                      const isSelected = selectedSecret?.key === s.key;
                      return (
                        <tr
                          key={s.key}
                          onClick={() => setSelectedSecret(s)}
                          className={cn(
                            "cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-blue-600/15 border-l-2 border-l-blue-500"
                              : "hover:bg-white/[0.03]"
                          )}
                        >
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-white/20 bg-black/40" />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-[#0c101a] border border-white/[0.08] flex items-center justify-center shrink-0">
                                {getSecretIcon(s.key)}
                              </div>
                              <div>
                                <span className="font-mono font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                                  {s.key}
                                </span>
                                {s.description && (
                                  <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                                    {s.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-md font-mono font-medium",
                                s.is_sensitive
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              )}
                            >
                              {s.is_sensitive ? "Secret" : "Text"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 max-w-sm sm:max-w-md">
                              <div className="relative flex-1 flex items-center min-w-0">
                                {isRevealed ? (
                                  <code className="font-mono text-xs text-sky-300 bg-sky-950/40 border border-sky-500/25 rounded-lg px-2.5 py-1 select-all truncate max-w-full">
                                    {revealed[s.key]}
                                  </code>
                                ) : (
                                  <span className="font-mono text-xs text-zinc-500 tracking-widest select-none bg-black/30 border border-white/[0.05] rounded-lg px-2.5 py-1">
                                    ••••••••••••••••
                                  </span>
                                )}
                              </div>

                              {canReveal && (
                                <button
                                  type="button"
                                  onClick={() => void reveal(s.key)}
                                  disabled={revealing[s.key]}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors shrink-0",
                                    isRevealed
                                      ? "text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30"
                                      : "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                                  )}
                                  title={isRevealed ? "Hide secret" : "Reveal secret"}
                                >
                                  {revealing[s.key] ? (
                                    <span className="block h-3.5 w-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                                  ) : isRevealed ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => void copyValue(s.key)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                                title="Copy secret value"
                              >
                                {copiedKey === s.key ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[9px] font-bold text-blue-300 shrink-0">
                                NS
                              </div>
                              <span className="text-zinc-400 text-[11px]">
                                {s.updated_at ? formatIso(s.updated_at) : "2 hours ago"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {canReveal && (
                                <button
                                  onClick={() => void reveal(s.key)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                                  title={isRevealed ? "Hide value" : "Reveal value"}
                                >
                                  {isRevealed ? <EyeOff className="h-3.5 w-3.5 text-blue-400" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              )}
                              <button
                                onClick={() => void copyValue(s.key)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                                title="Copy value"
                              >
                                {copiedKey === s.key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 bg-[#0c101a] border-white/[0.1] rounded-xl text-xs">
                                  {canWrite && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditing(s);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-2 text-zinc-400" /> Edit secret
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem asChild>
                                    <Link href={`${base}/keys/${s.key}`}>
                                      <ExternalLink className="h-3.5 w-3.5 mr-2 text-zinc-400" /> Overview & Usage
                                    </Link>
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                                      <DropdownMenuItem
                                        onClick={() => setDeleteTarget(s)}
                                        className="text-red-400 focus:bg-red-500/10"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete secret
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 7. Secret Inspector Flyout (Right Drawer matching secret page.png) */}
        <AnimatePresence>
          {selectedSecret && (
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="lg:col-span-4 glass-panel rounded-2xl border border-white/[0.08] p-5 space-y-5 shadow-2xl"
            >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  {getSecretIcon(selectedSecret.key)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{selectedSecret.key}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedSecret.description || "Environment secret variable"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSecret(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#07090e] border border-white/[0.06] text-xs">
              {(["details", "versions", "usage", "audit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg capitalize font-medium transition-all",
                    drawerTab === tab
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab: Details */}
            {drawerTab === "details" && (
              <div className="space-y-4 text-xs">
                {/* Value Preview Card */}
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#07090e] space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Secret Value</span>
                    <span className="text-[10px] text-zinc-500">v{selectedSecret.version ?? 1}</span>
                  </div>
                  <div className="font-mono text-zinc-200 py-1 tracking-wider break-all">
                    {revealed[selectedSecret.key] !== undefined
                      ? revealed[selectedSecret.key]
                      : "••••••••••••••••••••••••••••"}
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void reveal(selectedSecret.key)}
                      className="h-7 px-2.5 rounded-lg border-white/[0.1] text-[11px] text-zinc-300 hover:text-white"
                    >
                      {revealed[selectedSecret.key] !== undefined ? "Hide" : "Reveal"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copyValue(selectedSecret.key)}
                      className="h-7 px-2.5 rounded-lg border-white/[0.1] text-[11px] text-zinc-300 hover:text-white"
                    >
                      Copy value
                    </Button>
                  </div>
                </div>

                {/* Metadata list */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Type</span>
                    <span className="font-mono text-zinc-300 capitalize">
                      {selectedSecret.is_sensitive ? "Secret" : "Text"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Environment</span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className={cn("h-1.5 w-1.5 rounded-full", envDotClass(envSlug))} />
                      <span className="capitalize">{envSlug}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Last updated</span>
                    <span className="text-zinc-300">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Created by</span>
                    <span className="text-zinc-300">Niranjan Sah</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                    Quick actions
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#0c101a] text-zinc-300 hover:text-white text-xs"
                  >
                    <Link href={`${base}/keys/${selectedSecret.key}`}>
                      <span>Full overview & usage helper</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  </Button>
                  {canWrite && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(selectedSecret);
                        setDialogOpen(true);
                      }}
                      className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#0c101a] text-zinc-300 hover:text-white text-xs"
                    >
                      <span>Edit secret & tags</span>
                      <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      onClick={() => setDeleteTarget(selectedSecret)}
                      className="w-full justify-between h-9 rounded-xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs"
                    >
                      <span>Delete secret</span>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {drawerTab === "usage" && (
              <div className="space-y-3 text-xs">
                <p className="text-zinc-400">Include in Node.js / TypeScript:</p>
                <div className="p-3 rounded-xl bg-[#07090e] font-mono text-zinc-300 text-[11px] leading-relaxed">
                  <code>{`process.env.${selectedSecret.key}`}</code>
                </div>
                <p className="text-zinc-400 mt-2">In Python:</p>
                <div className="p-3 rounded-xl bg-[#07090e] font-mono text-zinc-300 text-[11px] leading-relaxed">
                  <code>{`import os\nos.environ.get("${selectedSecret.key}")`}</code>
                </div>
              </div>
            )}

            {(drawerTab === "versions" || drawerTab === "audit") && (
              <div className="py-8 text-center text-zinc-500 text-xs">
                <Clock className="h-6 w-6 mx-auto mb-2 text-zinc-600" />
                <p>Version history recorded.</p>
                <Link
                  href={`${base}/history`}
                  className="text-blue-400 hover:underline mt-1 inline-block"
                >
                  View full history timeline →
                </Link>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Secret Dialog (Add / Edit) */}
      <SecretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId ?? ""}
        envId={envId ?? ""}
        initial={editing}
        onSaved={async () => {
          setDialogOpen(false);
          await loadSecrets();
        }}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        projectId={projectId ?? ""}
        envId={envId ?? ""}
        existingKeys={secrets.map((s) => s.key)}
        onImported={async () => {
          setBulkOpen(false);
          await loadSecrets();
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete secret?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              Are you sure you want to delete <span className="font-mono text-zinc-200">{deleteTarget?.key}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/[0.1] text-zinc-300 text-xs hover:bg-white/[0.05]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
            >
              {deleting ? "Deleting…" : "Delete secret"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
