"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitCompare } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/forms/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type Row = {
  key: string;
  left: string | null;
  right: string | null;
  kind: "same" | "changed" | "only_left" | "only_right";
};

function computeDiff(
  a: Record<string, string>,
  b: Record<string, string>
): Row[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const rows: Row[] = [];
  for (const key of Array.from(keys).sort()) {
    const va = a[key];
    const vb = b[key];
    if (va !== undefined && vb === undefined) {
      rows.push({ key, left: va, right: null, kind: "only_left" });
    } else if (va === undefined && vb !== undefined) {
      rows.push({ key, left: null, right: vb, kind: "only_right" });
    } else if (va !== undefined && vb !== undefined) {
      rows.push({
        key,
        left: va,
        right: vb,
        kind: va === vb ? "same" : "changed",
      });
    }
  }
  return rows;
}

export default function ComparePage({
  params,
}: {
  params: { namespace: string; environment: string };
}) {
  const { namespace, environment } = params;
  const { token, environments } = useWorkspace();
  const [targetNs, setTargetNs] = useState<string>("");
  const [targetEnv, setTargetEnv] = useState<string>("");
  const [left, setLeft] = useState<Record<string, string>>({});
  const [right, setRight] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pairs = useMemo(() => {
    const out: { namespace: string; environment: string }[] = [];
    for (const [ns, envs] of Object.entries(environments)) {
      for (const e of envs) {
        if (ns === namespace && e === environment) continue;
        out.push({ namespace: ns, environment: e });
      }
    }
    return out;
  }, [environments, namespace, environment]);

  const runCompare = useCallback(async () => {
    if (!token || !targetNs || !targetEnv) return;
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([
        api.getSecrets(token, namespace, environment),
        api.getSecrets(token, targetNs, targetEnv),
      ]);
      if ("error" in l && typeof (l as { error: string }).error === "string") {
        throw new Error((l as { error: string }).error);
      }
      if ("error" in r && typeof (r as { error: string }).error === "string") {
        throw new Error((r as { error: string }).error);
      }
      setLeft(l as Record<string, string>);
      setRight(r as Record<string, string>);
    } catch (e) {
      setLeft({});
      setRight({});
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, namespace, environment, targetNs, targetEnv]);

  useEffect(() => {
    if (pairs.length && !targetNs) {
      setTargetNs(pairs[0].namespace);
      setTargetEnv(pairs[0].environment);
    }
  }, [pairs, targetNs]);

  const rows = useMemo(() => computeDiff(left, right), [left, right]);

  if (!token) {
    return (
      <EmptyState
        icon={GitCompare}
        title="API token required"
        description="Compare loads two environments via the REST API."
        actionHref="/settings"
        actionLabel="Settings"
      />
    );
  }

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Nothing to compare"
        description="Create another environment under a namespace your token can access, then pick it here."
        actionHref="/projects"
        actionLabel="Projects"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">
          Compare environments
        </h2>
        <p className="text-sm text-zinc-500">
          Source:{" "}
          <span className="font-mono text-zinc-400">
            {namespace}/{environment}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Target workspace</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[220px] justify-between border-zinc-700"
              >
                {targetNs && targetEnv ? (
                  <span className="font-mono text-xs">
                    {targetNs} / {targetEnv}
                  </span>
                ) : (
                  "Select…"
                )}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              {pairs.map((p) => (
                <DropdownMenuItem
                  key={`${p.namespace}/${p.environment}`}
                  className="font-mono text-xs"
                  onSelect={() => {
                    setTargetNs(p.namespace);
                    setTargetEnv(p.environment);
                  }}
                >
                  {p.namespace} / {p.environment}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={() => void runCompare()} disabled={loading}>
          {loading ? "Loading…" : "Run compare"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}

      {!loading && Object.keys(left).length + Object.keys(right).length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111827]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-[#0d111c] text-left text-xs uppercase text-zinc-500">
                <th className="p-3">Key</th>
                <th className="p-3">Source</th>
                <th className="p-3">Target</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="border-b border-zinc-800/80 hover:bg-zinc-800/30"
                >
                  <td className="p-3 font-mono text-xs text-violet-300">
                    {r.key}
                  </td>
                  <td className="max-w-[200px] truncate p-3 font-mono text-xs text-zinc-400">
                    {r.left ?? "—"}
                  </td>
                  <td className="max-w-[200px] truncate p-3 font-mono text-xs text-zinc-400">
                    {r.right ?? "—"}
                  </td>
                  <td className="p-3">
                    {r.kind === "same" && (
                      <Badge variant="secondary">Same</Badge>
                    )}
                    {r.kind === "changed" && (
                      <Badge variant="warning">Changed</Badge>
                    )}
                    {r.kind === "only_left" && (
                      <Badge variant="destructive">Only source</Badge>
                    )}
                    {r.kind === "only_right" && (
                      <Badge variant="success">Only target</Badge>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
