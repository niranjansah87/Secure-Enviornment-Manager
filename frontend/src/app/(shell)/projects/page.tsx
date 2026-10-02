"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Boxes,
  Layers,
  KeyRound,
  Search,
  Plus,
  ArrowRight,
  FolderKanban,
  Loader2,
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
import { Card } from "@/components/ui/card";
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
import { EmptyState } from "@/components/forms/empty-state";
import { StatCard } from "@/components/layout/stat-card";
import { envBadgeClass, envHex } from "@/lib/env-style";
import { formatIso } from "@/lib/utils";

type ProjectRow = {
  project: Project;
  environments: Environment[];
  secretCount: number | null; // null while loading
};

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ProjectsPage() {
  const router = useRouter();
  const { call, isAdmin, selectWorkspace } = useWorkspace();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projects = await call((t) => sem.listProjects(t));
      // Resolve environments per project in parallel.
      const withEnvs = await Promise.all(
        projects.map(async (project) => {
          const environments = await call((t) => sem.listEnvironments(t, project.id)).catch(() => []);
          return { project, environments, secretCount: null as number | null };
        }),
      );
      setRows(withEnvs);
      setLoading(false);

      // Lazily compute secret counts per project without blocking render.
      void Promise.all(
        withEnvs.map(async (row) => {
          const counts = await Promise.all(
            row.environments.map((e) =>
              call((t) => sem.listSecrets(t, row.project.id, e.id)).then((s) => s.length).catch(() => 0),
            ),
          );
          return counts.reduce((a, b) => a + b, 0);
        }),
      ).then((totals) => {
        setRows((prev) => prev.map((r, i) => ({ ...r, secretCount: totals[i] ?? 0 })));
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load projects");
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => r.project.name.toLowerCase().includes(query.toLowerCase()) || r.project.slug.includes(query.toLowerCase())),
    [rows, query],
  );

  const totals = useMemo(() => {
    const envCount = rows.reduce((a, r) => a + r.environments.length, 0);
    const secretCount = rows.reduce((a, r) => a + (r.secretCount ?? 0), 0);
    return { projects: rows.length, environments: envCount, secrets: secretCount };
  }, [rows]);

  const distribution = useMemo(() => {
    const buckets: Record<string, number> = { Production: 0, Staging: 0, Development: 0, Others: 0 };
    for (const r of rows) {
      for (const e of r.environments) {
        const s = e.slug.toLowerCase();
        if (s === "production" || s === "prod") buckets.Production++;
        else if (s === "staging" || s === "stage") buckets.Staging++;
        else if (s === "development" || s === "dev") buckets.Development++;
        else buckets.Others++;
      }
    }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: envHex(name === "Others" ? "other" : name) }));
  }, [rows]);

  const openProject = (row: ProjectRow) => {
    const env = row.environments.find((e) => e.slug === "production") ?? row.environments[0];
    if (!env) {
      toast.error("This project has no environments yet.");
      return;
    }
    selectWorkspace(row.project.slug, env.slug);
    router.push(`/${row.project.slug}/${env.slug}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <FolderKanban className="h-3.5 w-3.5" />
          Projects
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
          Organize your work into namespaces. Each project can have multiple environments with isolated variables, access control, and complete audit history.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total projects" value={loading ? "—" : String(totals.projects)} icon={Boxes} />
        <StatCard title="Total environments" value={loading ? "—" : String(totals.environments)} icon={Layers} />
        <StatCard title="Total secrets" value={loading ? "—" : String(totals.secrets)} icon={KeyRound} hint={rows.some((r) => r.secretCount === null) ? "counting…" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Main list */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="pl-9 bg-white/[0.03] border-white/8"
                aria-label="Search projects"
              />
            </div>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="bg-violet-600 hover:bg-violet-500">
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
              {error}
              <Button variant="outline" size="sm" className="ml-4" onClick={() => void load()}>
                Retry
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title={query ? "No matching projects" : "No projects yet"}
              description={query ? "Try a different search term." : "Create your first project to start managing environment variables."}
              actionLabel={isAdmin && !query ? "New project" : undefined}
              onAction={isAdmin && !query ? () => setShowCreate(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((row, i) => (
                <motion.div
                  key={row.project.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card className="group flex items-center gap-4 p-4 transition-colors hover:border-violet-500/30 hover:bg-[#141b2e]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-zinc-100">{row.project.name}</p>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">{row.project.slug}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {row.environments.slice(0, 4).map((e) => (
                          <span key={e.id} className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${envBadgeClass(e.slug)}`}>
                            {e.slug}
                          </span>
                        ))}
                        {row.environments.length > 4 && (
                          <span className="text-[10px] text-zinc-600">+{row.environments.length - 4}</span>
                        )}
                        {row.environments.length === 0 && <span className="text-[10px] text-zinc-600">No environments</span>}
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-center sm:block">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-600">Envs</p>
                      <p className="text-sm font-semibold text-zinc-200">{row.environments.length}</p>
                    </div>
                    <div className="hidden shrink-0 text-center sm:block">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-600">Secrets</p>
                      <p className="text-sm font-semibold text-zinc-200">{row.secretCount === null ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-zinc-600" /> : row.secretCount}</p>
                    </div>
                    <div className="hidden shrink-0 text-right lg:block">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-600">Created</p>
                      <p className="text-xs text-zinc-400">{formatIso(row.project.created_at)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 border-white/10" onClick={() => openProject(row)}>
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {isAdmin && (
            <Card className="p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Create a new project</h3>
              <p className="mt-1 text-xs text-zinc-500">Set up a new project with isolated environments and secure variable management.</p>
              <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 w-full bg-violet-600 hover:bg-violet-500">
                New project
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-100">Environment distribution</h3>
            {distribution.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-600">No environments yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} stroke="none">
                        {distribution.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">{totals.environments}</span>
                    <span className="text-[9px] text-zinc-500">Envs</span>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {distribution.map((d) => (
                    <li key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-medium text-zinc-300">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>

      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => void load()}
      />
    </div>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { call } = useWorkspace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setSlugEdited(false);
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalSlug = slug || slugify(name);
    if (!name.trim() || !finalSlug) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    try {
      await call((t) => sem.createProject(t, name.trim(), finalSlug));
      toast.success(`Project “${name.trim()}” created`);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New project</DialogTitle>
          <DialogDescription>Projects group related environments and their secrets.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="My Project"
              className="bg-black/40 border-white/10"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="my-project"
              className="bg-black/40 border-white/10 font-mono text-sm"
            />
            <p className="text-[11px] text-zinc-600">Used in URLs, e.g. /{slug || "my-project"}/production</p>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500">
              {saving ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
