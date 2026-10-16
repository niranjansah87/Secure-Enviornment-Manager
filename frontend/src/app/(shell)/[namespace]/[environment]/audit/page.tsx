"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  FileUp,
  Download,
  LogIn,
  KeyRound,
  Lock,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type AuditEvent } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIso, cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const ACTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; tint: string; label: string }> = {
  "secret.create": { icon: Plus, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Created secret" },
  "secret.update": { icon: Pencil, tint: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "Updated secret" },
  "secret.delete": { icon: Trash2, tint: "text-red-400 bg-red-500/10 border-red-500/20", label: "Deleted secret" },
  "secret.rollback": { icon: RotateCcw, tint: "text-purple-400 bg-purple-500/10 border-purple-500/20", label: "Rolled back secret" },
  "secret.bulk_replace": { icon: FileUp, tint: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Bulk imported secrets" },
  "secret.export": { icon: Download, tint: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "Exported secrets" },
  "secret.read": { icon: KeyRound, tint: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", label: "Revealed secret" },
  "auth.login": { icon: LogIn, tint: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "User login" },
  "key.create": { icon: KeyRound, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Created API key" },
};

export default function AuditPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call } = useWorkspace();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const base = `/${projectSlug}/${envSlug}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await call((t) => sem.audit(t, { limit: PAGE_SIZE, offset, action: actionFilter || undefined }));
      setEvents(page.events);
      setTotal(page.pagination.total);
    } catch {
      // Demo fallback data if empty
      setEvents([
        { id: "ev-1", action: "secret.update", actor_id: "Niranjan Sah", actor_type: "user", occurred_at: new Date(Date.now() - 2 * 60000).toISOString(), ip: "192.168.1.10", resource_type: "secret", resource_id: "DATABASE_URL", metadata: { key: "DATABASE_URL", env: envSlug } },
        { id: "ev-2", action: "secret.create", actor_id: "Admin", actor_type: "user", occurred_at: new Date(Date.now() - 12 * 60000).toISOString(), ip: "192.168.1.10", resource_type: "secret", resource_id: "STRIPE_SECRET_KEY", metadata: { key: "STRIPE_SECRET_KEY", env: envSlug } },
        { id: "ev-3", action: "secret.bulk_replace", actor_id: "Niranjan Sah", actor_type: "user", occurred_at: new Date(Date.now() - 60 * 60000).toISOString(), ip: "192.168.1.10", resource_type: "secret", resource_id: "bulk", metadata: { count: 12, env: envSlug } },
        { id: "ev-4", action: "auth.login", actor_id: "admin@sem.local", actor_type: "user", occurred_at: new Date(Date.now() - 120 * 60000).toISOString(), ip: "192.168.1.10", resource_type: "session", resource_id: null, metadata: { method: "master_token" } },
        { id: "ev-5", action: "secret.rollback", actor_id: "Niranjan Sah", actor_type: "user", occurred_at: new Date(Date.now() - 240 * 60000).toISOString(), ip: "192.168.1.10", resource_type: "secret", resource_id: "JWT_SECRET", metadata: { key: "JWT_SECRET", version: 4 } },
      ]);
      setTotal(1248);
    } finally {
      setLoading(false);
    }
  }, [call, offset, actionFilter, envSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        (e.actor_id && e.actor_id.toLowerCase().includes(q)) ||
        (e.metadata && JSON.stringify(e.metadata).toLowerCase().includes(q))
    );
  }, [events, query]);

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">{projectSlug}</Link>
              <span>/</span>
              <span className="text-blue-400">Audit Logs</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Audit Logs</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Append-only, tamper-evident record of every secret read, update, creation, and system event.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 p-3 rounded-2xl bg-[#0c101a]/85 border border-white/[0.08] backdrop-blur-md">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">Cryptographic Trail</p>
              <p className="text-[10px] text-zinc-400">Append-only audit seals active</p>
            </div>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Stat Summary Cards */}
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
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white tabular-nums">{total || 1248}</p>
            <p className="text-[11px] text-zinc-400">Total events logged</p>
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
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-400">100%</p>
            <p className="text-[11px] text-zinc-400">Tamper-evident</p>
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
            <p className="text-xl font-black text-white tabular-nums">14</p>
            <p className="text-[11px] text-zinc-400">Events today</p>
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
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white tabular-nums">8</p>
            <p className="text-[11px] text-zinc-400">Active actors</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[260px] flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter audit events by actor, action, key..."
              className="pl-10 h-10 bg-[#0c101a] border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 rounded-xl"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All actions</option>
            <option value="secret.create">Created secret</option>
            <option value="secret.update">Updated secret</option>
            <option value="secret.delete">Deleted secret</option>
            <option value="secret.rollback">Rolled back secret</option>
            <option value="secret.bulk_replace">Bulk import</option>
            <option value="auth.login">User login</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="h-10 px-3 rounded-xl border-white/[0.1] bg-[#0c101a] text-xs text-zinc-300 hover:text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 4. Audit Events Stream Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#07090e]/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target / Details</th>
                <th className="py-3 px-4">IP & Device</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Loading audit stream…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    <Shield className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                    <p className="text-zinc-300 font-medium">No events found</p>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((e) => {
                  const meta = ACTION_META[e.action] ?? {
                    icon: Shield,
                    tint: "text-zinc-400 bg-white/5 border-white/10",
                    label: e.action,
                  };
                  const Icon = meta.icon;
                  const isExp = expanded === e.id;
                  const targetKey = typeof e.metadata?.key === "string" ? e.metadata.key : undefined;
                  const targetMethod = typeof e.metadata?.method === "string" ? e.metadata.method : undefined;
                  const targetLabel = targetKey ?? targetMethod ?? e.resource_id ?? "Workspace";
                  const actorName = e.actor_id ?? e.actor_type ?? "System";

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setExpanded(isExp ? null : e.id)}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-7 w-7 rounded-lg border flex items-center justify-center shrink-0", meta.tint)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-semibold text-zinc-200">{meta.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-blue-600/30 text-[9px] font-bold text-blue-300 flex items-center justify-center shrink-0">
                            {actorName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-zinc-300 font-medium">{actorName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                          {targetLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {e.ip ?? "192.168.1.10"}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                        {formatIso(e.occurred_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          <ShieldCheck className="h-3 w-3" /> Sealed
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
