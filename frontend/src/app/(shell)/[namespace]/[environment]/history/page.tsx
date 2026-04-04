"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCcw, History } from "lucide-react";
import { api, ApiError, type HistoryEntry } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIso } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";

export default function HistoryPage({
  params,
}: {
  params: { namespace: string; environment: string };
}) {
  const { namespace, environment } = params;
  const { token } = useWorkspace();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.history(token, namespace, environment);
      setItems(res.history ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, namespace, environment]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rollback(id: string) {
    if (!token) return;
    setRolling(id);
    try {
      await api.rollback(token, namespace, environment, id);
      toast.success("Restored snapshot");
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Rollback failed");
    } finally {
      setRolling(null);
    }
  }

  if (!token) {
    return (
      <EmptyState
        icon={History}
        title="Sign in via API token"
        description="Add a token in Settings to view encrypted history."
        actionHref="/settings"
        actionLabel="Settings"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={History}
        title="No history yet"
        description="Changes to this environment will appear here as encrypted snapshots."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">Version history</h2>
        <p className="text-sm text-zinc-500">
          Snapshots are encrypted on the server. Restore overwrites the current
          environment.
        </p>
      </div>
      <div className="relative pl-4">
        <div className="absolute bottom-0 left-[7px] top-2 w-px bg-zinc-800" />
        <ul className="space-y-5">
          {items.map((h, i) => (
            <motion.li
              key={h.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative pl-8"
            >
              <span className="absolute left-0 top-2 h-3 w-3 rounded-full border-2 border-[#0B0F19] bg-violet-500" />
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-[#111827] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{h.action}</Badge>
                    <span className="text-xs text-zinc-500">
                      {formatIso(h.timestamp)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{h.description}</p>
                  <p className="mt-1 text-xs text-zinc-600">User: {h.user_id}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rolling === h.id}
                  onClick={() => void rollback(h.id)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {rolling === h.id ? "Restoring…" : "Restore"}
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
