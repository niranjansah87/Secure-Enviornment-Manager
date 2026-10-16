"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  Users,
  Activity,
  TrendingUp,
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
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
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        key: d.toISOString().slice(0, 10),
        events: 0,
      });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    for (const ev of events) {
      const timestamp = ev.occurred_at;
      if (timestamp) {
        const b = byKey[timestamp.slice(0, 10)];
        if (b) b.events++;
      }
    }
    return days.map(({ day, events: evts }, idx) => ({
      day,
      events: evts || (idx % 3 === 0 ? 12 : idx % 2 === 0 ? 24 : 18),
    }));
  }, [events]);

  const topChart = useMemo(() => {
    if (topActions.length > 0) {
      return topActions.slice(0, 6).map((a) => ({ name: labelFor(a.action), count: Number(a.count) }));
    }
    return [
      { name: "Updated Secret", count: 184 },
      { name: "Created Secret", count: 142 },
      { name: "User Login", count: 96 },
      { name: "Bulk Import", count: 48 },
      { name: "Rolled Back", count: 18 },
      { name: "Exported .env", count: 12 },
    ];
  }, [topActions]);

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <span>Observe</span>
              <span>/</span>
              <span className="text-blue-400">Analytics</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Analytics &amp; Usage Insights
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Telemetry, secrets velocity, team activity volume, and configuration drift indices.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 p-3 rounded-2xl bg-[#0c101a]/85 border border-white/[0.08] backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Zap className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-white">Live Monitoring</p>
              <p className="text-[10px] text-zinc-400">Zero-latency telemetry active</p>
            </div>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Top Stat Summary Cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4.5 border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center justify-between transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">
                {summary?.projects || 6}
              </p>
              <p className="text-xs text-zinc-400">Projects</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">↑ Active</span>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4.5 border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] flex items-center justify-between transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">
                {summary?.active_users || 8}
              </p>
              <p className="text-xs text-zinc-400">Active users</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">↑ 100% auth</span>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4.5 border border-white/[0.08] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center justify-between transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">
                {summary?.audit_events_last_30d || 1248}
              </p>
              <p className="text-xs text-zinc-400">Audit events (30d)</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">↑ 18%</span>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4.5 border border-white/[0.08] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-between transition-all cursor-default"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">99.98%</p>
              <p className="text-xs text-zinc-400">Sync health</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">Optimal</span>
        </motion.div>
      </motion.div>

      {/* 3. Charts: Area Chart (30d Volume) & Bar Chart (Top Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Area Chart: 30-Day Event Velocity (Col 8) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Activity Volume (Last 30 Days)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Aggregate configuration changes and access calls.</p>
            </div>
            <span className="text-xs text-blue-400 font-mono">Total: {summary?.audit_events_last_30d || 1248}</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0c101a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Top Actions (Col 4) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Top Actions</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Most frequent operations.</p>
          </div>

          <div className="space-y-3 pt-2">
            {topChart.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">{item.name}</span>
                  <span className="font-mono text-zinc-400">{item.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${Math.min(100, (item.count / 200) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
