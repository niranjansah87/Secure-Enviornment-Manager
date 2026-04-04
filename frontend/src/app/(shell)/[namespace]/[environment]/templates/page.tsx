"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";

export default function TemplatesPage({
  params,
}: {
  params: { namespace: string; environment: string };
}) {
  const { namespace, environment } = params;
  const { token } = useWorkspace();
  const [templates, setTemplates] = useState<
    Record<
      string,
      { name: string; description?: string; variables: Record<string, string> }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.templatesList(token);
      setTemplates(res.templates ?? {});
    } catch {
      setTemplates({});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply(key: string) {
    if (!token) return;
    setApplying(key);
    try {
      await api.applyTemplate(token, namespace, environment, key);
      toast.success("Template applied");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Apply failed");
    } finally {
      setApplying(null);
    }
  }

  if (!token) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="API token required"
        description="Templates are merged into the active environment on the server."
        actionHref="/settings"
        actionLabel="Settings"
      />
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const entries = Object.entries(templates);

  if (!entries.length) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="No templates"
        description="Add entries to templates_config.json on the server."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">Templates</h2>
        <p className="text-sm text-zinc-500">
          Bootstrap variables. Existing keys are overwritten when names collide.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, t], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -2 }}
          >
            <Card className="h-full border-zinc-800 bg-[#111827] transition-shadow hover:shadow-lg hover:shadow-violet-500/5">
              <CardHeader>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                {t.description && (
                  <CardDescription>{t.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-zinc-500">
                  {Object.keys(t.variables ?? {}).length} variables
                </p>
                <Button
                  size="sm"
                  disabled={applying === key}
                  onClick={() => void apply(key)}
                >
                  {applying === key ? "Applying…" : "Apply to environment"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
