"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  FolderOpen,
  Layers,
  Key,
  Users,
  Plus,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const ENV_DOT: Record<string, string> = {
  production: "bg-green-400",
  staging: "bg-orange-400",
  development: "bg-blue-400",
  dev: "bg-blue-400",
  preview: "bg-purple-400",
  test: "bg-yellow-400",
};

const ENV_BADGE: Record<string, string> = {
  dev: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  development: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  staging: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  prod: "bg-green-500/15 text-green-400 border-green-500/20",
  production: "bg-green-500/15 text-green-400 border-green-500/20",
  preview: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  test: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

const PIE_COLORS = ["#7c3aed", "#f59e0b", "#3b82f6", "#6b7280"];

function envDot(env: string) {
  return ENV_DOT[env.toLowerCase()] ?? "bg-zinc-400";
}

function envBadge(env: string) {
  return ENV_BADGE[env.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

type Project = {
  namespace: string;
  envs: string[];
};

export default function ProjectsPage() {
  const { environments, token, loadingEnvs, envError, setWorkspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const projects: Project[] = Object.entries(environments).map(([ns, envs]) => ({
    namespace: ns,
    envs,
  }));

  const filtered = query
    ? projects.filter((p) =>
        p.namespace.toLowerCase().includes(query.toLowerCase()) ||
        p.envs.some((e) => e.toLowerCase().includes(query.toLowerCase()))
      )
    : projects;

  // Distribution data for pie chart
  const pieData = [
    { name: "Production", value: projects.filter((p) => p.envs.some((e) => e.toLowerCase().includes("prod"))).length },
    { name: "Staging", value: projects.filter((p) => p.envs.some((e) => e.toLowerCase().includes("staging"))).length },
    { name: "Development", value: projects.filter((p) => p.envs.some((e) => e.toLowerCase().includes("dev"))).length },
    { name: "Others", value: Math.max(0, projects.length - 3) },
  ].filter((d) => d.value > 0);

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <Image
            src="/admin_header_image.png"
            alt=""
            fill
            className="object-cover object-center opacity-30"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 flex items-center justify-between px-8 py-8 min-h-[110px]">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="mt-1.5 text-sm text-zinc-400 max-w-xl">
              Organize your work into namespaces. Each project can have multiple environments
              with isolated variables, access control, and complete audit history.
            </p>
          </div>
          <div className="hidden lg:block text-right text-sm text-zinc-400">
            Secure every<br />environment you build.
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loadingEnvs ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />
          ))
        ) : (
          <>
            {[
              { label: "Total projects", value: String(projects.length), icon: FolderOpen, color: "text-violet-400 bg-violet-400/10" },
              { label: "Total environments", value: String(projects.reduce((a, p) => a + p.envs.length, 0)), icon: Layers, color: "text-blue-400 bg-blue-400/10" },
              { label: "Total secrets", value: "—", icon: Key, color: "text-emerald-400 bg-emerald-400/10" },
              { label: "Team members", value: "—", icon: Users, color: "text-orange-400 bg-orange-400/10" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0d0f18] px-4 py-4"
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white leading-none">{s.value}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{s.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>

      <div className="flex gap-6">
        {/* Project list */}
        <div className="flex-1 min-w-0">
          {/* Search / filter bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-lg border border-white/8 bg-white/[0.03] pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1">
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  viewMode === "list" ? "bg-white/10 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  viewMode === "grid" ? "bg-white/10 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <Button
              size="sm"
              className="h-9 bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 ml-auto"
              title="Create new project (requires backend support)"
            >
              <Plus className="h-3.5 w-3.5" />
              New project
            </Button>
          </div>

          {/* Error */}
          {envError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {envError}
            </div>
          )}

          {/* Loading */}
          {loadingEnvs && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loadingEnvs && filtered.length === 0 && !envError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/5 mb-4">
                <FolderOpen className="h-7 w-7 text-zinc-600" />
              </div>
              <h3 className="text-sm font-medium text-zinc-300">
                {query ? "No matching projects" : "No projects yet"}
              </h3>
              <p className="mt-1.5 text-xs text-zinc-600 max-w-xs">
                {query
                  ? `No projects match "${query}"`
                  : "Create encrypted .enc files under data/<namespace>/ on the server to get started."}
              </p>
            </div>
          )}

          {/* Project list / grid */}
          {!loadingEnvs && filtered.length > 0 && (
            <AnimatePresence mode="wait">
              {viewMode === "list" ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {filtered.map((p, i) => (
                    <motion.div
                      key={p.namespace}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group flex items-center gap-4 rounded-xl border border-white/8 bg-[#0d0f18] px-5 py-4 hover:border-white/12 hover:bg-[#111320] transition-all"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-violet-400">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold text-zinc-100">{p.namespace}</h3>
                          <span className="text-[10px] text-emerald-400 font-medium border border-emerald-500/20 bg-emerald-500/10 rounded px-1.5 py-0.5">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.envs.map((e) => (
                            <span
                              key={e}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                envBadge(e)
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", envDot(e))} />
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center gap-8 text-xs text-zinc-500 mr-4">
                        <div className="text-center min-w-[52px]">
                          <div className="text-sm font-semibold text-zinc-300">{p.envs.length}</div>
                          <div className="text-[10px] mt-0.5">Environments</div>
                        </div>
                        <div className="text-center min-w-[52px]">
                          <div className="text-sm font-semibold text-zinc-300">—</div>
                          <div className="text-[10px] mt-0.5">Secrets</div>
                        </div>
                      </div>
                      <Link
                        href={`/${p.namespace}/${p.envs[0]}`}
                        onClick={() => setWorkspace({ namespace: p.namespace, environment: p.envs[0] })}
                        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white border border-white/8 hover:border-white/15 rounded-lg px-3 py-1.5 transition-all shrink-0"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {filtered.map((p, i) => (
                    <motion.div
                      key={p.namespace}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={`/${p.namespace}/${p.envs[0]}`}
                        onClick={() => setWorkspace({ namespace: p.namespace, environment: p.envs[0] })}
                        className="group block rounded-xl border border-white/8 bg-[#0d0f18] p-5 hover:border-white/12 hover:bg-[#111320] transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-violet-400 mb-3">
                          <Layers className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-100 mb-2">{p.namespace}</h3>
                        <div className="flex flex-wrap gap-1">
                          {p.envs.map((e) => (
                            <span
                              key={e}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                envBadge(e)
                              )}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                          Open workspace <ArrowRight className="h-3 w-3" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Right sidebar panel */}
        <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
          {/* Create project CTA */}
          <div className="rounded-xl border border-white/8 bg-[#0d0f18] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400 mb-3">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Create a new project</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Set up a new project with isolated environments and secure variable management.
            </p>
            <Button
              size="sm"
              className="w-full bg-white/8 hover:bg-white/12 text-zinc-200 border-0 text-xs"
              variant="secondary"
            >
              New project →
            </Button>
          </div>

          {/* Distribution chart */}
          <div className="rounded-xl border border-white/8 bg-[#0d0f18] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Project distribution</h3>
            {pieData.length > 0 ? (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={52}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-white">{projects.length}</span>
                    <span className="text-[9px] text-zinc-500">Projects</span>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-zinc-400">{d.name}</span>
                      </div>
                      <span className="text-zinc-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-24 items-center justify-center text-xs text-zinc-600">
                No data
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border border-white/8 bg-[#0d0f18] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Recent activity</h3>
              <span className="text-[11px] text-zinc-600 hover:text-zinc-400 cursor-pointer">View all →</span>
            </div>
            <div className="space-y-3 text-xs text-zinc-500">
              {[
                { icon: Key, text: "Updated secret", sub: "DATABASE_URL in main", time: "2 hours ago" },
                { icon: Plus, text: "Created environment", sub: "staging in main", time: "8 hours ago" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-zinc-400 mt-0.5">
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-300 text-[11px] font-medium">{item.text}</p>
                      <p className="text-zinc-600 text-[10px] truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-zinc-700 shrink-0">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
