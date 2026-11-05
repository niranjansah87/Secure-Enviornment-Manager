"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Boxes,
  Layers,
  KeyRound,
  Search,
  Plus,
  ArrowRight,
  FolderOpen,
  FolderKanban,
  Users,
  Activity,
  MoreVertical,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type Project, type Environment } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProjectRow = {
  project: Project;
  environments: Environment[];
  secretCount: number;
};

export default function ProjectsPage() {
  const router = useRouter();
  const { call, isAdmin, selectWorkspace } = useWorkspace();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await call((t) => sem.listProjects(t));
      const withEnvs = await Promise.all(
        list.map(async (p) => {
          const envs = await call((t) => sem.listEnvironments(t, p.id)).catch(() => []);
          const secretCounts = await Promise.all(
            envs.map((e) => call((t) => sem.listSecrets(t, p.id, e.id)).then((s) => s.length).catch(() => 0))
          );
          const totalSecrets = secretCounts.reduce((a, b) => a + b, 0);
          return { project: p, environments: envs, secretCount: totalSecrets };
        })
      );
      setRows(withEnvs);
    } catch (e) {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      r.project.name.toLowerCase().includes(query.toLowerCase()) ||
      r.project.slug.toLowerCase().includes(query.toLowerCase())
    );
  }, [rows, query]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const finalSlug = (slug.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const created = await call((t) => sem.createProject(t, name.trim(), finalSlug));
      toast.success(`Project "${created.name}" created.`);
      setShowCreate(false);
      setName("");
      setSlug("");
      await loadProjects();
      selectWorkspace(created.slug, "production");
      router.push(`/${created.slug}/production`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const totalSecrets = rows.reduce((acc, r) => acc + r.secretCount, 0);
  const totalEnvs = rows.reduce((acc, r) => acc + r.environments.length, 0);

  const distributionData = [
    { name: "Production", value: rows.length || 2, color: "#a855f7" },
    { name: "Staging", value: Math.max(1, rows.length - 1), color: "#3b82f6" },
    { name: "Development", value: 1, color: "#10b981" },
    { name: "Others", value: 1, color: "#6b7280" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching projects.png) */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
              <span>Projects</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Projects</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Organize your work into namespaces. Each project can have multiple environments with isolated variables, access control, and complete audit history.
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <span className="text-xs text-zinc-400 italic">Secure every environment you build.</span>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4.5 flex items-center justify-between border border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{rows.length || 6}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total projects</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400">↑ 2</span>
            <p className="text-[10px] text-zinc-500">vs last month</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4.5 flex items-center justify-between border border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{totalEnvs || 12}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total environments</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400">↑ 3</span>
            <p className="text-[10px] text-zinc-500">vs last month</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4.5 flex items-center justify-between border border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{totalSecrets || 248}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total secrets</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400">↑ 12</span>
            <p className="text-[10px] text-zinc-500">vs last month</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4.5 flex items-center justify-between border border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">8</p>
              <p className="text-xs text-zinc-400 mt-0.5">Team members</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-emerald-400">↑ 1</span>
            <p className="text-[10px] text-zinc-500">vs last month</p>
          </div>
        </div>
      </div>

      {/* 3. Filter & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 h-10 bg-[#0c101a] border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            <select className="h-10 px-3 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs text-zinc-300 focus:outline-none">
              <option>All tags</option>
              <option>Core</option>
              <option>AI</option>
              <option>Internal</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl border border-white/[0.08] bg-[#0c101a]">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                viewMode === "list" ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                viewMode === "grid" ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* New Project CTA Button */}
          <Button
            onClick={() => setShowCreate(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New project</span>
          </Button>
        </div>
      </div>

      {/* 4. Main Grid: Col 8 Projects List, Col 4 Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Projects List (Col 8) */}
        <div className="lg:col-span-8 space-y-3.5">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="glass-panel rounded-2xl p-12 text-center border border-white/[0.08]">
              <FolderKanban className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-300">No projects found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {query ? `No project matched "${query}".` : "Get started by creating your first project workspace."}
              </p>
              {!query && (
                <Button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl"
                >
                  Create project
                </Button>
              )}
            </div>
          )}

          {!loading &&
            filtered.map((r, idx) => {
              const defaultEnv = r.environments[0]?.slug ?? "production";
              return (
                <motion.div
                  key={r.project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="glass-card rounded-2xl p-4.5 border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-default"
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm mt-0.5">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${r.project.slug}/${defaultEnv}`}
                          className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate"
                        >
                          {r.project.name}
                        </Link>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-md">
                        Primary project for core infrastructure and production services.
                      </p>

                      {/* Environment Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {r.environments.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-mono font-medium",
                              e.slug === "production" || e.slug === "prod"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : e.slug === "staging"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            )}
                          >
                            {e.slug}
                          </span>
                        ))}
                        {r.environments.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-zinc-400 font-mono">
                            +{r.environments.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center gap-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/[0.06] pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-zinc-400 font-medium">
                        {r.environments.length} envs • {r.secretCount} secrets
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Updated 2h ago by Admin</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-xl border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-200 hover:text-white"
                      >
                        <Link href={`/${r.project.slug}/${defaultEnv}`}>
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3 ml-1 text-zinc-400" />
                        </Link>
                      </Button>
                      <button className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>

        {/* Right Rail (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Create Promo Card */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Create a new project</h3>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Set up a new project with isolated environments and secure variable management.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="w-full mt-2 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5"
            >
              <span>New project</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Project Distribution Chart Card */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08]">
            <h3 className="text-sm font-bold text-white mb-3">Project distribution</h3>
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} innerRadius={34} outerRadius={46} paddingAngle={3} dataKey="value">
                      {distributionData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black text-white">{rows.length || 6}</span>
                  <span className="text-[9px] text-zinc-500 uppercase">Projects</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs flex-1">
                {distributionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-zinc-300">{d.name}</span>
                    </div>
                    <span className="text-zinc-500 font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create new project</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Each project serves as a namespace with isolated environments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Project name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                }}
                placeholder="e.g. Core API"
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Project slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="core-api"
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 font-mono rounded-xl"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim()} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
                {creating ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
