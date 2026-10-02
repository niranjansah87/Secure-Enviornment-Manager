"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  KeyRound,
  Users,
  Activity,
  ArrowRight,
  FolderOpen,
  FileUp,
  GitCompare,
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  LogIn,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useWorkspace } from "@/context/workspace-context";
import { sem, type AuditEvent, type Project } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import { envBadgeClass, envHex } from "@/lib/env-style";
import { cn } from "@/lib/utils";

type DashData = {
  projects: Project[];
  envTotal: number;
  secretTotal: number;
  byEnvKind: { name: string; value: number; color: string }[];
  projectEnvBadges: Record<string, string[]>;
  projectSecretCounts: Record<string, number>;
  activeUsers: number;
  auditEvents30d: number;
  recent: AuditEvent[];
  activitySeries: { day: string; created: number; updated: number }[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function envKind(slug: string): "Production" | "Staging" | "Development" | "Preview" | "Other" {
  const s = slug.toLowerCase();
  if (s === "production" || s === "prod") return "Production";
  if (s === "staging" || s === "stage") return "Staging";
  if (s === "development" || s === "dev") return "Development";
  if (s === "preview") return "Preview";
  return "Other";
}

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "secret.create": Plus,
  "secret.update": Pencil,
  "secret.delete": Trash2,
  "secret.rollback": RotateCcw,
  "secret.bulk_replace": FileUp,
  "auth.login": LogIn,
};

function actionLabel(a: string): string {
  const map: Record<string, string> = {
    "secret.create": "Created secret",
    "secret.update": "Updated secret",
    "secret.delete": "Deleted secret",
    "secret.rollback": "Rolled back secret",
    "secret.bulk_replace": "Bulk import",
    "secret.export": "Exported secrets",
    "auth.login": "User login",
  };
  return map[a] ?? a.replace(/[._]/g, " ");
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { call, displayName, isAdmin, selectWorkspace } = useWorkspace();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, summary, auditPage] = await Promise.all([
        call((t) => sem.listProjects(t)),
        call((t) => sem.analyticsSummary(t)).catch(() => ({ projects: 0, active_users: 0, audit_events_last_30d: 0 })),
        call((t) => sem.audit(t, { limit: 200, from: new Date(Date.now() - 7 * 86400000).toISOString() })).catch(() => ({ events: [], pagination: { total: 0, limit: 0, offset: 0 } })),
      ]);

      // Resolve envs + secret counts per project.
      const projectData = await Promise.all(
        projects.map(async (p) => {
          const envs = await call((t) => sem.listEnvironments(t, p.id)).catch(() => []);
          const perEnv = await Promise.all(
            envs.map(async (e) => ({
              env: e,
              count: await call((t) => sem.listSecrets(t, p.id, e.id)).then((s) => s.length).catch(() => 0),
            })),
          );
          return { project: p, envs, perEnv };
        }),
      );

      const byEnvKindMap: Record<string, number> = {};
      const projectEnvBadges: Record<string, string[]> = {};
      const projectSecretCounts: Record<string, number> = {};
      let envTotal = 0;
      let secretTotal = 0;
      for (const pd of projectData) {
        envTotal += pd.envs.length;
        projectEnvBadges[pd.project.id] = pd.envs.map((e) => e.slug);
        let projSecrets = 0;
        for (const { env, count } of pd.perEnv) {
          secretTotal += count;
          projSecrets += count;
          const kind = envKind(env.slug);
          byEnvKindMap[kind] = (byEnvKindMap[kind] ?? 0) + count;
        }
        projectSecretCounts[pd.project.id] = projSecrets;
      }

      const byEnvKind = Object.entries(byEnvKindMap)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, color: envHex(name === "Other" ? "other" : name) }));

      // Build a 7-day activity series from audit events.
      const days: { day: string; key: string; created: number; updated: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), key: d.toISOString().slice(0, 10), created: 0, updated: 0 });
      }
      const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
      for (const ev of auditPage.events) {
        const key = ev.occurred_at.slice(0, 10);
        const bucket = byKey[key];
        if (!bucket) continue;
        if (ev.action === "secret.create") bucket.created++;
        else if (ev.action === "secret.update" || ev.action === "secret.bulk_replace") bucket.updated++;
      }

      setData({
        projects,
        envTotal,
        secretTotal,
        byEnvKind,
        projectEnvBadges,
        projectSecretCounts,
        activeUsers: summary.active_users,
        auditEvents30d: summary.audit_events_last_30d,
        recent: auditPage.events.slice(0, 6),
        activitySeries: days.map(({ day, created, updated }) => ({ day, created, updated })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = useMemo(() => new Date(), []);

  const openProject = (p: Project) => {
    void call((t) => sem.listEnvironments(t, p.id)).then((envs) => {
      const env = envs.find((e) => e.slug === "production") ?? envs[0];
      if (env) {
        selectWorkspace(p.slug, env.slug);
        router.push(`/${p.slug}/${env.slug}`);
      } else {
        router.push("/projects");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#121a2e] via-[#0c111d] to-[#0a0d16] px-8 py-8">
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {greeting()}, {displayName}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">Here&rsquo;s an overview of your environments and activity.</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm text-zinc-400">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Environments" value={loading ? "—" : String(data?.envTotal ?? 0)} icon={Boxes} />
        <StatCard title="Secrets" value={loading ? "—" : String(data?.secretTotal ?? 0)} icon={KeyRound} />
        <StatCard title="Team members" value={loading ? "—" : String(data?.activeUsers ?? 0)} icon={Users} />
        <StatCard title="Audit events (30d)" value={loading ? "—" : String(data?.auditEvents30d ?? 0)} icon={Activity} />
      </div>

      {error && (
        <Card className="border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{error}</Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h3 className="text-base font-semibold text-zinc-100">Environment activity</h3>
          <p className="text-xs text-zinc-500">Secret creations and updates over the last 7 days.</p>
          <div className="mt-6 h-64">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg bg-white/5" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.activitySeries ?? []} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e4e4e7" }}
                  />
                  <Bar dataKey="created" name="Creations" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="updated" name="Updates" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold text-zinc-100">Secrets by environment</h3>
          <p className="text-xs text-zinc-500">Total secrets across all environments.</p>
          <div className="mt-6 h-64">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg bg-white/5" />
            ) : (data?.byEnvKind.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600">No secrets yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data!.byEnvKind} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                    {data!.byEnvKind.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="p-6 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100">Recent activity</h3>
            <Link href="/analytics" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (data?.recent.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-600">No recent activity.</p>
          ) : (
            <ul className="space-y-1">
              {data!.recent.map((ev) => {
                const Icon = ACTION_ICON[ev.action] ?? Shield;
                const key = (ev.metadata?.key as string) ?? (ev.resource_type ?? "");
                return (
                  <li key={ev.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{actionLabel(ev.action)}</p>
                      {key && <p className="truncate text-xs text-zinc-500 font-mono">{key}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-zinc-600">{relativeTime(ev.occurred_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Your projects */}
        <Card className="p-6 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100">Your projects</h3>
            <Link href="/projects" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (data?.projects.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-600">No projects yet.</p>
          ) : (
            <ul className="space-y-1">
              {data!.projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button onClick={() => openProject(p)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{p.name}</p>
                      <p className="text-xs text-zinc-500">{data!.projectSecretCounts[p.id] ?? 0} secrets</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {(data!.projectEnvBadges[p.id] ?? []).slice(0, 3).map((s) => (
                        <span key={s} className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium border", envBadgeClass(s))}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-zinc-100">Quick actions</h3>
          <div className="space-y-2">
            <QuickAction href="/projects" icon={FolderOpen} title="Browse projects" desc="View all workspaces" />
            <QuickAction href="/analytics" icon={Activity} title="View analytics" desc="Usage and security insights" />
            {isAdmin && <QuickAction href="/apikeys" icon={KeyRound} title="API keys" desc="Manage access tokens" />}
            <QuickAction href="/projects" icon={GitCompare} title="Compare environments" desc="Find configuration drift" />
            <QuickAction href="/projects" icon={LayoutTemplate} title="Use a template" desc="Start with presets" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-violet-500/30 hover:bg-white/[0.05]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:text-violet-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
    </Link>
  );
}
