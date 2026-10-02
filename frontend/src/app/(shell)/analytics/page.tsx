"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type AnalyticsSummary, type TopAction, type AuditEvent } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";

function labelFor(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnalyticsPage() {
  const { call } = useWorkspace();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topActions, setTopActions] = useState<TopAction[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, ta, page] = await Promise.all([
        call((t) => sem.analyticsSummary(t)),
        call((t) => sem.topActions(t)).catch(() => []),
        call((t) => sem.audit(t, { limit: 200, from: new Date(Date.now() - 30 * 86400000).toISOString() })).catch(() => ({ events: [], pagination: { total: 0, limit: 0, offset: 0 } })),
      ]);
      setSummary(s);
      setTopActions(ta);
      setEvents(page.events);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const series = useMemo(() => {
    const days: { day: string; key: string; events: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), key: d.toISOString().slice(0, 10), events: 0 });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    for (const ev of events) {
      const b = byKey[ev.occurred_at.slice(0, 10)];
      if (b) b.events++;
    }
    return days.map(({ day, events }) => ({ day, events }));
  }, [events]);

  const topChart = useMemo(() => topActions.slice(0, 7).map((a) => ({ name: labelFor(a.action), count: Number(a.count) })), [topActions]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Usage and activity insights across your organization.</p>
        </div>
        {error && <Button variant="outline" size="sm" className="border-white/10" onClick={() => void load()}>Retry</Button>}
      </div>

      {error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">{error}</Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Projects" value={loading ? "—" : String(summary?.projects ?? 0)} icon={Boxes} />
            <StatCard title="Active users" value={loading ? "—" : String(summary?.active_users ?? 0)} icon={Users} />
            <StatCard title="Audit events (30d)" value={loading ? "—" : String(summary?.audit_events_last_30d ?? 0)} icon={Activity} />
          </div>

          <Card className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              <h3 className="text-base font-semibold text-zinc-100">Activity over time</h3>
            </div>
            <p className="text-xs text-zinc-500">Audit events per day, last 30 days.</p>
            <div className="mt-6 h-72">
              {loading ? (
                <Skeleton className="h-full w-full rounded-lg bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e4e4e7" }} />
                    <Area type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={2} fill="url(#act)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-zinc-100">Top actions</h3>
              <p className="text-xs text-zinc-500">Most frequent events, all time.</p>
              <div className="mt-6 h-72">
                {loading ? (
                  <Skeleton className="h-full w-full rounded-lg bg-white/5" />
                ) : topChart.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">No activity yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topChart} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-zinc-100">Action breakdown</h3>
              <p className="text-xs text-zinc-500">Event counts by type.</p>
              <div className="mt-4 space-y-1">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded bg-white/5" />)
                ) : topActions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-600">No activity yet.</p>
                ) : (
                  topActions.map((a) => {
                    const max = Math.max(...topActions.map((x) => Number(x.count)), 1);
                    const pct = (Number(a.count) / max) * 100;
                    return (
                      <div key={a.action} className="flex items-center gap-3 py-1">
                        <span className="w-40 shrink-0 truncate text-xs text-zinc-300">{labelFor(a.action)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-400">{a.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
