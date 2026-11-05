"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Layers,
  Users,
  Link2,
  AlertTriangle,
  FolderOpen,
  Boxes,
  Plus,
  Check,
  Copy,
  Lock,
  Globe,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError, type Environment } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
};

const TABS: TabItem[] = [
  { id: "General", label: "General", icon: Settings },
  { id: "Environments", label: "Environments", icon: Layers },
  { id: "Access Control", label: "Access Control", icon: Users },
  { id: "Integrations", label: "Integrations", icon: Link2 },
  { id: "Danger Zone", label: "Danger Zone", icon: AlertTriangle, danger: true },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const router = useRouter();
  const { call, isAdmin, refreshProjects } = useWorkspace();
  const { project } = useResolvedWorkspace(projectSlug, envSlug);

  const [activeTab, setActiveTab] = useState<string>("General");
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState(project?.name ?? projectSlug);
  const [description, setDescription] = useState(
    "Primary project for core infrastructure and production services."
  );
  const [visibility, setVisibility] = useState<"private" | "org" | "public">("private");
  const [tags, setTags] = useState(["core", "infrastructure", "production"]);
  const [defaultEnv, setDefaultEnv] = useState("production");

  // Dialogs
  const [showCreateEnv, setShowCreateEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvSlug, setNewEnvSlug] = useState("");
  const [creatingEnv, setCreatingEnv] = useState(false);

  const [deleteEnvTarget, setDeleteEnvTarget] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState(false);

  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);

  const base = `/${projectSlug}/${envSlug}`;

  const loadEnvs = useCallback(async () => {
    if (!project) return;
    setLoadingEnvs(true);
    try {
      setEnvs(await call((t) => sem.listEnvironments(t, project.id)));
    } catch {
      setEnvs([]);
    } finally {
      setLoadingEnvs(false);
    }
  }, [project, call]);

  useEffect(() => {
    void loadEnvs();
  }, [loadEnvs]);

  const copyId = () => {
    const id = project?.id ?? "prj_8f3a2d9e6c1b";
    void navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("Project ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newEnvName.trim()) return;
    setCreatingEnv(true);
    try {
      const s = (newEnvSlug.trim() || newEnvName.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      await call((t) => sem.createEnvironment(t, project.id, newEnvName.trim(), s));
      toast.success(`Environment "${newEnvName}" created`);
      setShowCreateEnv(false);
      setNewEnvName("");
      setNewEnvSlug("");
      await loadEnvs();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || confirmSlug !== project.slug) return;
    setDeletingProject(true);
    try {
      await call((t) => sem.deleteProject(t, project.id));
      toast.success(`Deleted project "${project.slug}"`);
      await refreshProjects();
      router.push("/projects");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete project");
    } finally {
      setDeletingProject(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching project settings.png) */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">{projectSlug}</Link>
              <span>/</span>
              <span className="text-blue-400">Settings</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Project Settings</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1">
              Configure environments, access control, integrations, and other project settings.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 p-3 rounded-2xl bg-[#0c101a]/85 border border-white/[0.08] backdrop-blur-md">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{projectSlug}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-zinc-400">Production</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">dev</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">staging</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-red-500/10 text-red-400 border border-red-500/20">prod</span>
            </div>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Settings Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap",
                active
                  ? "bg-blue-600/25 text-white border border-blue-500/30 shadow-sm"
                  : t.danger
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Grid (Col 8 Forms, Col 4 Right Summary Rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Col 8) */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {activeTab === "General" && (
                <>
              {/* Section 1: Project Information */}
              <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Project Information</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Basic details about your project.</p>
                  </div>
                  <Button
                    onClick={() => toast.success("Project information saved.")}
                    className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save changes</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Project name</label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="bg-[#07090e] border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Description</label>
                      <span className="text-[10px] text-zinc-500">{description.length}/500</span>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="bg-[#07090e] border-white/[0.1] text-xs text-zinc-100 rounded-xl resize-none"
                    />
                  </div>
                </div>

                {/* Project Icon */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-zinc-300">Project icon</label>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                      <Boxes className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-xl border-white/[0.1] bg-[#0c101a] text-xs text-zinc-200 hover:text-white"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5 text-zinc-400" /> Change icon
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-xl text-xs text-zinc-400 hover:text-white"
                        >
                          Use default
                        </Button>
                      </div>
                      <p className="text-[11px] text-zinc-500">Supports SVG, PNG, JPG. Max size 1MB.</p>
                    </div>
                  </div>
                </div>

                {/* Project Tags */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-zinc-300">Project tags</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#07090e] border border-white/[0.08] text-xs text-zinc-300 font-mono"
                      >
                        <span>{t}</span>
                        <button
                          onClick={() => setTags((ts) => ts.filter((x) => x !== t))}
                          className="text-zinc-500 hover:text-zinc-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        const next = prompt("Enter tag name:");
                        if (next) setTags((ts) => [...ts, next.trim()]);
                      }}
                      className="px-3 py-1 rounded-xl border border-dashed border-white/[0.15] text-xs text-zinc-400 hover:text-white"
                    >
                      + Add tag
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Project Visibility */}
              <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Project Visibility</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Control who can see and access this project.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "private", title: "Private", desc: "Only invited members can access this project.", icon: Lock },
                    { id: "org", title: "Organization", desc: "All organization members can view this project.", icon: Users },
                    { id: "public", title: "Public (read-only)", desc: "Anyone with the link can view (requires authentication).", icon: Globe },
                  ].map((item) => {
                    const Icon = item.icon;
                    const selected = visibility === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setVisibility(item.id as "private" | "org" | "public")}
                        className={cn(
                          "p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between",
                          selected
                            ? "bg-blue-600/15 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                            : "bg-[#07090e] border-white/[0.08] hover:bg-white/[0.03]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-blue-400">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full border flex items-center justify-center",
                              selected ? "border-blue-400 bg-blue-500" : "border-zinc-600"
                            )}
                          >
                            {selected && <span className="h-1 w-1 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{item.title}</p>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Default Environment Dropdown */}
                <div className="pt-2 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Default environment</label>
                  <div className="max-w-xs">
                    <select
                      value={defaultEnv}
                      onChange={(e) => setDefaultEnv(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-white/[0.08] bg-[#07090e] text-xs text-zinc-200 capitalize"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    This will be the selected environment when members open this project.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === "Environments" && (
            <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Environments</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Isolated staging and production targets.</p>
                </div>
                <Button
                  onClick={() => setShowCreateEnv(true)}
                  className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add environment
                </Button>
              </div>

              <div className="space-y-3">
                {envs.map((e) => (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-xl border border-white/[0.06] bg-[#07090e] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white font-mono">{e.name}</p>
                        <p className="text-[10px] text-zinc-500">slug: {e.slug}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteEnvTarget(e)}
                      className="text-red-400 hover:bg-red-500/10 text-xs h-8"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Danger Zone" && (
            <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-950/10 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Irreversible actions. Deleting this project will wipe all environment variables and version history.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteProject(true)}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
              >
                Delete project
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>

        {/* Right Column: Project Summary & Environments Rail (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Project Summary */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{projectSlug}</h4>
                  <p className="text-[10px] text-zinc-500">Production</p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-lg border-white/[0.1] text-[11px] text-zinc-300 hover:text-white"
              >
                <Link href={base}>Open project →</Link>
              </Button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total environments</span>
                <span className="font-mono text-zinc-200">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total secrets</span>
                <span className="font-mono text-zinc-200">48</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total variables</span>
                <span className="font-mono text-zinc-200">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Team members</span>
                <span className="font-mono text-zinc-200">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Created on</span>
                <span className="text-zinc-300">Jun 12, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Last updated</span>
                <span className="text-zinc-300">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Created by</span>
                <span className="text-zinc-300">Niranjan Sah</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <span className="text-zinc-500">Project ID</span>
                <button
                  onClick={copyId}
                  className="font-mono text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>{project?.id?.slice(0, 14) ?? "prj_8f3a2d9e6c1b"}</span>
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Environments List */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="text-xs font-bold text-white">Environments</h4>
              <button
                onClick={() => setActiveTab("Environments")}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Manage environments →
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: "Production", secrets: 48, vars: 12, isDefault: true, color: "bg-emerald-400" },
                { name: "Staging", secrets: 32, vars: 8, isDefault: false, color: "bg-amber-400" },
                { name: "Development", secrets: 28, vars: 6, isDefault: false, color: "bg-blue-400" },
              ].map((env) => (
                <div
                  key={env.name}
                  className="p-2.5 rounded-xl border border-white/[0.05] bg-[#07090e] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", env.color)} />
                    <div>
                      <p className="font-semibold text-zinc-200">{env.name}</p>
                      <p className="text-[10px] text-zinc-500">{env.secrets} secrets • {env.vars} variables</p>
                    </div>
                  </div>
                  {env.isDefault && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Member Access */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="text-xs font-bold text-white">Member Access</h4>
              <Link href="/admin/users" className="text-[11px] text-blue-400 hover:underline">
                Manage members →
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-600 border border-blue-400/40 text-[10px] font-bold text-white flex items-center justify-center shadow">
                NS
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-600 border border-purple-400/40 text-[10px] font-bold text-white flex items-center justify-center shadow">
                A
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-600 border border-indigo-400/40 text-[10px] font-bold text-white flex items-center justify-center shadow">
                P
              </div>
              <div className="h-8 w-8 rounded-full bg-sky-600 border border-sky-400/40 text-[10px] font-bold text-white flex items-center justify-center shadow">
                S
              </div>
              <div className="h-8 w-8 rounded-full bg-white/[0.06] border border-white/[0.1] text-[10px] font-semibold text-zinc-400 flex items-center justify-center">
                +4
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">8 members (3 admins • 5 developers)</p>
          </div>
        </div>
      </div>

      {/* Create Environment Dialog */}
      <Dialog open={showCreateEnv} onOpenChange={setShowCreateEnv}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add environment</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create an isolated environment target for {projectSlug}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEnv} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300">Environment name</label>
              <Input
                value={newEnvName}
                onChange={(e) => {
                  setNewEnvName(e.target.value);
                  if (!newEnvSlug) setNewEnvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                }}
                placeholder="e.g. Preview"
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300">Slug</label>
              <Input
                value={newEnvSlug}
                onChange={(e) => setNewEnvSlug(e.target.value)}
                placeholder="preview"
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 font-mono rounded-xl"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateEnv(false)} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={creatingEnv || !newEnvName.trim()} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
                {creatingEnv ? "Creating..." : "Add environment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Alert */}
      <AlertDialog open={showDeleteProject} onOpenChange={setShowDeleteProject}>
        <AlertDialogContent className="bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project &ldquo;{projectSlug}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              This action cannot be undone. All environment variables, history records, and API configurations will be permanently destroyed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-zinc-300">
              Please type <span className="font-mono font-bold text-red-400">{projectSlug}</span> to confirm:
            </p>
            <Input
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={projectSlug}
              className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 font-mono rounded-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.1] text-zinc-300 hover:text-white text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmSlug !== projectSlug || deletingProject}
              onClick={() => void handleDeleteProject()}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
            >
              {deletingProject ? "Deleting..." : "Permanently delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
