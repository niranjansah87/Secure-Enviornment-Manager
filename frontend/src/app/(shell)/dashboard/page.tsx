"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Layers,
  Key,
  Users,
  ArrowRight,
  MoreHorizontal,
  TrendingUp,
  Plus,
  FileInput,
  GitCompare,
  LayoutTemplate,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api, ApiError, type AuditEntry, type AnalyticsResponse } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatIso, cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ACTION_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  set: { icon: Key, color: "text-blue-400 bg-blue-400/10" },
  delete: { icon: Key, color: "text-red-400 bg-red-400/10" },
  bulk_replace: { icon: FileInput, color: "text-orange-400 bg-orange-400/10" },
  login: { icon: Users, color: "text-green-400 bg-green-400/10" },
  create_key: { icon: Key, color: "text-violet-400 bg-violet-400/10" },
};

function getActionDisplay(action: string) {
  const map: Record<string, string> = {
    set: "Updated secret",
    delete: "Deleted secret",
    bulk_replace: "Bulk import",
    login: "User login",
    create_key: "Created API key",
    create: "Created secret",
    update: "Updated secret",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

const ENV_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#6b7280"];

function StatCard({
  title,
  value,
  delta,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-white/8 bg-[#0d0f18] p-5"
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white leading-none">{value}</span>
            {delta && (
              <span className="text-xs text-green-400 flex items-center gap-0.5 mb-0.5">
                <TrendingUp className="h-3 w-3" />
                {delta}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

const ENV_BADGE_COLORS: Record<string, string> = {
  dev: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  staging: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  prod: "bg-green-500/15 text-green-400 border-green-500/20",
  production: "bg-green-500/15 text-green-400 border-green-500/20",
  preview: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

function EnvBadge({ label }: { label: string }) {
  const cls = ENV_BADGE_COLORS[label.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", cls)}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { token, workspace, environments, username } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    environment_count: number;
    secret_count: number;
    last_updated: string | null;
    recent_activity: AuditEntry[];
  } | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.metaStats(token).catch(() => null),
      api.metaAnalytics(token, 7).catch(() => null),
    ]).then(([s, a]) => {
      if (!cancelled) {
        setStats(s);
        setAnalytics(a);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [token]);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build projects list from environments
  const projects: { namespace: string; envs: string[] }[] = [];
  for (const [ns, envs] of Object.entries(environments)) {
    projects.push({ namespace: ns, envs });
  }

  // Chart data from analytics
  const activityData = analytics?.trends?.map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Creations: t.updates,
    Updates: t.access,
  })) ?? [];

  const envDistData = analytics?.distribution?.namespaces?.map((n, i) => ({
    name: n.name,
    value: n.estimated_secrets,
    color: ENV_COLORS[i % ENV_COLORS.length],
  })) ?? [];

  const totalSecrets = analytics?.distribution?.total_secrets ?? stats?.secret_count ?? 0;

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <Image
            src="/admin_header_image.png"
            alt=""
            fill
            className="object-cover object-center opacity-40"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        </div>
        <div className="relative z-10 flex items-end justify-between px-8 py-8 min-h-[120px]">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {greeting()}, {username ?? "there"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Here&apos;s an overview of your environments and activity.
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm text-zinc-400">{dateStr}</p>
            <p className="text-2xl font-semibold text-white mt-0.5">{timeStr}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
          ))
        ) : (
          <>
            <StatCard
              title="Environments"
              value={String(stats?.environment_count ?? 0)}
              delta="vs last month"
              icon={Layers}
              color="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              title="Secrets"
              value={String(totalSecrets)}
              delta="vs last month"
              icon={Key}
              color="bg-violet-500/10 text-violet-400"
            />
            <StatCard
              title="Team members"
              value="—"
              icon={Users}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              title="Audit events"
              value={String(stats?.recent_activity?.length ?? 0)}
              icon={Activity}
              color="bg-orange-500/10 text-orange-400"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Activity chart */}
        <div className="lg:col-span-2 rounded-xl border border-white/8 bg-[#0d0f18] p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Environment activity</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Secret changes and configuration updates across environments.
              </p>
            </div>
            <button className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 border border-white/8 rounded-lg px-3 py-1.5 transition-colors">
              Last 7 days
              <MoreHorizontal className="h-3 w-3 ml-1" />
            </button>
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityData} barSize={8} barGap={2}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#52525b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#52525b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#e4e4e7",
                  }}
                />
                <Bar dataKey="Creations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Updates" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : loading ? (
            <Skeleton className="h-44 rounded-lg bg-white/5" />
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-zinc-600">
              No activity data available
            </div>
          )}
          {!loading && activityData.length > 0 && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Creations
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                Updates
              </div>
            </div>
          )}
        </div>

        {/* Donut chart */}
        <div className="rounded-xl border border-white/8 bg-[#0d0f18] p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">Secrets by environment</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Total secrets across all environments.
            </p>
          </div>
          {envDistData.length > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={envDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {envDistData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-white">{totalSecrets}</span>
                  <span className="text-[10px] text-zinc-500">Total</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                {envDistData.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: e.color }}
                      />
                      <span className="text-zinc-400 truncate max-w-[100px]">{e.name}</span>
                    </div>
                    <span className="text-zinc-300 font-medium">{e.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : loading ? (
            <Skeleton className="h-40 rounded-lg bg-white/5" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-600">
              No data
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-1 rounded-xl border border-white/8 bg-[#0d0f18] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent activity</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Latest changes across your environments.</p>
            </div>
            {workspace && (
              <Link
                href={`/${workspace.namespace}/${workspace.environment}/audit`}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />
              ))
            ) : !stats?.recent_activity?.length ? (
              <p className="text-sm text-zinc-600 py-4 text-center">No recent activity</p>
            ) : (
              stats.recent_activity.slice(0, 8).map((a, i) => {
                const meta = ACTION_ICON[a.action] ?? { icon: Activity, color: "text-zinc-400 bg-zinc-400/10" };
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3"
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", meta.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-200 leading-none">
                        {getActionDisplay(a.action)}
                      </p>
                      {a.resource && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {a.resource}
                          {a.environment ? ` in ${a.environment}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
                      {formatIso(a.timestamp)}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Your projects */}
        <div className="lg:col-span-1 rounded-xl border border-white/8 bg-[#0d0f18] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Your projects</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Quick access to your workspaces.</p>
            </div>
            <Link
              href="/projects"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-white/5" />
              ))
            ) : projects.length === 0 ? (
              <p className="text-sm text-zinc-600 py-4 text-center">No projects yet</p>
            ) : (
              projects.slice(0, 6).map((p, i) => (
                <motion.div
                  key={p.namespace}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] hover:border-white/8 transition-all group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{p.namespace}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {p.envs.slice(0, 3).map((e) => (
                        <EnvBadge key={e} label={e} />
                      ))}
                      {p.envs.length > 3 && (
                        <span className="text-[9px] text-zinc-600">+{p.envs.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/${p.namespace}/${p.envs[0]}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="h-4 w-4 text-zinc-500" />
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-white/8 bg-[#0d0f18] p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">Quick actions</h2>
          </div>
          <div className="space-y-2">
            {[
              {
                icon: Key,
                label: "Open secrets",
                desc: "Manage environment variables",
                href: workspace ? `/${workspace.namespace}/${workspace.environment}` : "/projects",
              },
              {
                icon: Layers,
                label: "Browse projects",
                desc: "View all workspaces",
                href: "/projects",
              },
              {
                icon: FileInput,
                label: "Import variables",
                desc: "Bulk import from .env file",
                href: workspace ? `/${workspace.namespace}/${workspace.environment}` : "/projects",
              },
              {
                icon: GitCompare,
                label: "Compare environments",
                desc: "Find configuration differences",
                href: workspace ? `/${workspace.namespace}/${workspace.environment}/compare` : "/projects",
              },
              {
                icon: LayoutTemplate,
                label: "Use a template",
                desc: "Start with pre-configured templates",
                href: workspace ? `/${workspace.namespace}/${workspace.environment}/templates` : "/projects",
              },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] hover:border-white/8 transition-all group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/8 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-white/8 transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 leading-none">{action.label}</p>
                    <p className="text-[11px] text-zinc-600 truncate mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
