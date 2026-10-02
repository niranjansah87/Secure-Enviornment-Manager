"use client";

import { use, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate, Boxes, Check, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem, ApiError } from "@/lib/sem-api";
import { TEMPLATES, type EnvTemplate } from "@/lib/templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/forms/empty-state";
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

export default function TemplatesPage({ params }: { params: Promise<{ namespace: string; environment: string }> }) {
  const { namespace: projectSlug, environment: envSlug } = use(params);
  const { call, isAdmin, scopes } = useWorkspace();
  const { projectId, envId, error: resolveError } = useResolvedWorkspace(projectSlug, envSlug);
  const canWrite = isAdmin || scopes.includes("secrets:write");

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [preview, setPreview] = useState<EnvTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const visible = useMemo(() => (category === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category)), [category]);

  async function apply(template: EnvTemplate) {
    if (!projectId || !envId) return;
    setApplying(true);
    try {
      await call((t) =>
        sem.bulkReplaceSecrets(
          t,
          projectId,
          envId,
          template.variables.map((v) => ({ key: v.key, value: v.value, description: v.description, is_sensitive: v.sensitive })),
        ),
      );
      toast.success(`Applied “${template.name}” — ${template.variables.length} variables added`, {
        description: "Edit the placeholder values in Secrets.",
      });
      setPreview(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply template");
    } finally {
      setApplying(false);
    }
  }

  if (resolveError) {
    return <EmptyState icon={Boxes} title={resolveError} description="This environment doesn't exist or you lack access." actionLabel="Back to projects" actionHref="/projects" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <LayoutTemplate className="h-3.5 w-3.5" /> {projectSlug} / {envSlug} / Templates
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Templates</h1>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
          Start an environment with a curated set of variables. Applying a template adds placeholder keys you then fill in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", category === c ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-white/8 bg-white/[0.02] text-zinc-400 hover:text-zinc-200")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((template, i) => (
          <motion.div key={template.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
            <Card className="flex h-full flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                  <Package className="h-5 w-5" />
                </div>
                <span className="rounded-md border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">{template.category}</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{template.name}</h3>
              <p className="mt-1 flex-1 text-xs text-zinc-500">{template.description}</p>
              <p className="mt-3 text-[11px] text-zinc-600">{template.variables.length} variables</p>
              <Button variant="outline" size="sm" className="mt-3 w-full border-white/10" onClick={() => setPreview(template)} disabled={!canWrite}>
                {canWrite ? "Preview & apply" : "Read-only"}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">{preview?.name}</DialogTitle>
            <DialogDescription>These variables will be added to {projectSlug} / {envSlug}. Existing keys with the same name are updated.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-xs">
            {preview?.variables.map((v) => (
              <div key={v.key} className="flex items-center gap-2">
                <span className="text-violet-300">{v.key}</span>
                <span className="text-zinc-600">=</span>
                <span className="truncate text-zinc-500">{v.sensitive && !v.value ? "<set me>" : v.value || "<empty>"}</span>
                {v.sensitive && <span className="ml-auto rounded bg-amber-500/10 px-1 text-[9px] text-amber-400">secret</span>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={applying} className="text-zinc-400">
              Cancel
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-500" disabled={applying} onClick={() => preview && void apply(preview)}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Apply template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
