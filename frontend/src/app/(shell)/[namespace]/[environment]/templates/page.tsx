"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Database, Server, Cpu, Code2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError } from "@/lib/sem-api";
import { TEMPLATES, type EnvTemplate } from "@/lib/templates";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Framework", "Database", "Infrastructure", "Service"] as const;

function getTemplateIcon(category: string) {
  switch (category) {
    case "Database":
      return <Database className="h-5 w-5 text-blue-400" />;
    case "Infrastructure":
      return <Server className="h-5 w-5 text-purple-400" />;
    case "Service":
      return <Cpu className="h-5 w-5 text-emerald-400" />;
    default:
      return <Code2 className="h-5 w-5 text-sky-400" />;
  }
}

export default function TemplatesPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes } = useWorkspace();
  const { projectId, envId } = useResolvedWorkspace(projectSlug, envSlug);
  const canWrite = isAdmin || scopes.includes("secrets:write");

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [preview, setPreview] = useState<EnvTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const base = `/${projectSlug}/${envSlug}`;

  const visible = useMemo(
    () => (category === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category)),
    [category]
  );

  async function apply(template: EnvTemplate) {
    if (!projectId || !envId) return;
    setApplying(true);
    try {
      await call((t) =>
        sem.bulkReplaceSecrets(
          t,
          projectId,
          envId,
          template.variables.map((v) => ({
            key: v.key,
            value: v.value,
            description: v.description,
            is_sensitive: v.sensitive,
          }))
        )
      );
      toast.success(`Applied "${template.name}" template with ${template.variables.length} variables.`);
      setPreview(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply template");
    } finally {
      setApplying(false);
    }
  }

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
              <span className="text-blue-400">Templates</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Environment Templates
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Pre-configured environment variables for frameworks, databases, and microservices.
              Apply directly to <span className="text-white font-semibold font-mono">{envSlug}</span>.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 p-3 rounded-2xl bg-[#0c101a]/85 border border-white/[0.08] backdrop-blur-md">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs font-bold text-white">{TEMPLATES.length} Curated Stacks</p>
              <p className="text-[10px] text-zinc-400">Production-ready configurations</p>
            </div>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
              category === c
                ? "bg-blue-600/25 text-white border border-blue-500/40 shadow-sm"
                : "bg-[#0c101a] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 3. Templates Grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {visible.map((tpl) => (
          <motion.div
            key={tpl.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
            }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all flex flex-col justify-between space-y-4 group cursor-default"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  {getTemplateIcon(tpl.category)}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400 font-mono">
                  {tpl.variables.length} vars
                </span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                {tpl.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {tpl.description}
              </p>

              {/* Sample Variables */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tpl.variables.slice(0, 3).map((v) => (
                  <span
                    key={v.key}
                    className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#07090e] border border-white/[0.06] text-zinc-400"
                  >
                    {v.key}
                  </span>
                ))}
                {tpl.variables.length > 3 && (
                  <span className="text-[10px] text-zinc-500 font-mono self-center">
                    +{tpl.variables.length - 3} more
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(tpl)}
              className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#07090e] hover:bg-blue-600 hover:border-blue-500 hover:text-white text-xs font-semibold text-zinc-200 transition-all"
            >
              <span>Inspect & Apply</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Inspect & Apply Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg bg-[#0c101a] border-white/[0.1] rounded-2xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    {getTemplateIcon(preview.category)}
                  </div>
                  <div>
                    <DialogTitle className="text-white text-base">{preview.name}</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                      {preview.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <p className="text-xs font-semibold text-zinc-300">Variables in this template:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {preview.variables.map((v) => (
                    <div
                      key={v.key}
                      className="p-2.5 rounded-xl border border-white/[0.06] bg-[#07090e] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono text-zinc-200 font-semibold">{v.key}</span>
                        {v.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">{v.description}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-mono font-medium",
                          v.sensitive
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        )}
                      >
                        {v.sensitive ? "Secret" : "Text"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPreview(null)}
                  className="text-zinc-400 text-xs"
                >
                  Cancel
                </Button>
                {canWrite && (
                  <Button
                    onClick={() => void apply(preview)}
                    disabled={applying}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
                  >
                    {applying ? "Applying..." : `Apply to ${envSlug}`}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
