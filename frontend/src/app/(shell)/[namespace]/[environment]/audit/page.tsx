"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
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
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type AuditEvent } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";
import { formatIso, cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const ACTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  "secret.create": { icon: Plus, tint: "text-emerald-400 bg-emerald-500/10" },
  "secret.update": { icon: Pencil, tint: "text-blue-400 bg-blue-500/10" },
  "secret.delete": { icon: Trash2, tint: "text-red-400 bg-red-500/10" },
  "secret.rollback": { icon: RotateCcw, tint: "text-violet-400 bg-violet-500/10" },
  "secret.bulk_replace": { icon: FileUp, tint: "text-amber-400 bg-amber-500/10" },
  "secret.export": { icon: Download, tint: "text-zinc-300 bg-white/5" },
  "secret.read": { icon: KeyRound, tint: "text-zinc-300 bg-white/5" },
  "auth.login": { icon: LogIn, tint: "text-blue-400 bg-blue-500/10" },
};

const FILTER_ACTIONS = ["", "secret.create", "secret.update", "secret.delete", "secret.rollback", "secret.bulk_replace", "secret.export"];

function labelFor(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditPage({ params }: { params: Promise<{ namespace: string; environment: string }> }) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call } = useWorkspace();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await call((t) => sem.audit(t, { limit: PAGE_SIZE, offset, action: action || undefined }));
      setEvents(page.events);
      setTotal(page.pagination.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [call, offset, action]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) => e.action.toLowerCase().includes(q) || (e.resource_type ?? "").toLowerCase().includes(q) || JSON.stringify(e.metadata ?? {}).toLowerCase().includes(q),
    );
  }, [events, query]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <Shield className="h-3.5 w-3.5" /> {projectSlug} / {envSlug} / Audit
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Audit logs</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Tamper-evident record of every access and change across your organization.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter current page…" className="pl-9 bg-white/[0.03] border-white/8" />
        </div>
        <select
          value={action}
          onChange={(e) => {
            setOffset(0);
            setAction(e.target.value);
          }}
          className="h-10 rounded-lg border border-white/8 bg-black/40 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          {FILTER_ACTIONS.map((a) => (
            <option key={a || "all"} value={a} className="bg-zinc-900">
              {a ? labelFor(a) : "All actions"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />)}
        </div>
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void load()}>Retry</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No audit events" description={query || action ? "No events match your filters." : "Activity will appear here as you and your team work."} />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-white/[0.03]">
            {filtered.map((ev) => {
              const meta = ACTION_META[ev.action] ?? { icon: Shield, tint: "text-zinc-300 bg-white/5" };
              const Icon = meta.icon;
              const key = (ev.metadata?.key as string) ?? ev.resource_type ?? "";
              const open = expanded === ev.id;
              return (
                <li key={ev.id}>
                  <button className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.02]" onClick={() => setExpanded(open ? null : ev.id)}>
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{labelFor(ev.action)}</p>
                      {key && <p className="truncate font-mono text-[11px] text-zinc-500">{key}</p>}
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-xs text-zinc-400">{formatIso(ev.occurred_at)}</p>
                      <p className="text-[11px] text-zinc-600">{ev.actor_type}{ev.ip ? ` · ${ev.ip}` : ""}</p>
                    </div>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 border-t border-white/5 bg-black/20 px-4 py-3 text-xs sm:grid-cols-3">
                          <Field label="Event ID" value={ev.id} mono />
                          <Field label="Actor" value={ev.actor_id ?? ev.actor_type} mono />
                          <Field label="Resource" value={`${ev.resource_type ?? "—"}${ev.resource_id ? ` (${ev.resource_id.slice(0, 8)}…)` : ""}`} />
                          <Field label="IP" value={ev.ip ?? "—"} />
                          <Field label="Time" value={formatIso(ev.occurred_at)} />
                          {ev.metadata && Object.entries(ev.metadata).map(([k, v]) => <Field key={k} label={k} value={String(v)} mono />)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Pagination */}
      {!loading && !error && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {pageCount} · {total} events
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" className="border-white/10" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={cn("truncate text-zinc-300", mono && "font-mono")}>{value}</p>
    </div>
  );
}
