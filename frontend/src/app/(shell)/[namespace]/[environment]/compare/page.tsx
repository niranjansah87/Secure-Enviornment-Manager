"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import { GitCompare, ArrowLeftRight, ChevronDown } from "lucide-react";
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
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace, environment } = use(params);
  const { token, environments } = useWorkspace();

  // "Left" Side State - Source
  const [leftNs, setLeftNs] = useState<string>("");
  const [leftEnv, setLeftEnv] = useState<string>("");

  // "Right" Side State - Target
  const [rightNs, setRightNs] = useState<string>("");
  const [rightEnv, setRightEnv] = useState<string>("");

  const [leftData, setLeftData] = useState<Record<string, string>>({});
  const [rightData, setRightData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten environments for selection
  const allPairs = useMemo(() => {
    const out: { namespace: string; environment: string }[] = [];
    for (const [ns, envs] of Object.entries(environments)) {
      for (const e of envs) {
        out.push({ namespace: ns, environment: e });
      }
    }
    return out;
  }, [environments]);

  // Initial setup from URL params
  useEffect(() => {
    if (namespace && environment && !leftNs) {
      setLeftNs(namespace);
      setLeftEnv(environment);
      
      // Default right side to the first available different environment
      const other = allPairs.find(p => p.namespace !== namespace || p.environment !== environment);
      if (other) {
        setRightNs(other.namespace);
        setRightEnv(other.environment);
      }
    }
  }, [namespace, environment, leftNs, allPairs]);

  const runCompare = useCallback(async () => {
    if (!token || !leftNs || !leftEnv || !rightNs || !rightEnv) return;
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([
        api.getSecrets(token, leftNs, leftEnv),
        api.getSecrets(token, rightNs, rightEnv),
      ]);
      
      if ("error" in l) throw new Error((l as any).error);
      if ("error" in r) throw new Error((r as any).error);
      
      setLeftData(l as Record<string, string>);
      setRightData(r as Record<string, string>);
    } catch (e: any) {
      setLeftData({});
      setRightData({});
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, leftNs, leftEnv, rightNs, rightEnv]);

  const swapSides = () => {
    const oldLeftNs = leftNs;
    const oldLeftEnv = leftEnv;
    const oldLeftData = leftData;

    setLeftNs(rightNs);
    setLeftEnv(rightEnv);
    setLeftData(rightData);

    setRightNs(oldLeftNs);
    setRightEnv(oldLeftEnv);
    setRightData(oldLeftData);
  };

  const rows = useMemo(() => computeDiff(leftData, rightData), [leftData, rightData]);

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

  if (allPairs.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Insufficient environments"
        description="You need at least two environments to run a comparison."
        actionHref="/projects"
        actionLabel="Projects"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100 italic tracking-tight">
          Symmetric Compare
        </h2>
        <p className="text-sm text-zinc-500">
          Analyze differences between any two environments side-by-side.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-md">
        {/* Left Selector */}
        <div className="flex-1 space-y-2 min-w-[220px]">
          <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Source (Left)</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-white/10 bg-black/40 font-mono text-xs hover:bg-black/60 transition-all py-6 rounded-xl">
                <span className="truncate">{leftNs} / {leftEnv}</span>
                <ChevronDown className="h-4 w-4 opacity-40 shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto w-64 bg-zinc-950 border-white/10">
              {allPairs.map((p) => (
                <DropdownMenuItem
                  key={`left-${p.namespace}/${p.environment}`}
                  className="font-mono text-xs focus:bg-violet-500/20 focus:text-violet-200"
                  onSelect={() => {
                    setLeftNs(p.namespace);
                    setLeftEnv(p.environment);
                  }}
                >
                  {p.namespace} / {p.environment}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Swap Action */}
        <Button
          variant="ghost"
          size="icon"
          className="mt-6 h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-violet-600 hover:text-white transition-all duration-300 shadow-lg shadow-black/50"
          onClick={swapSides}
          title="Swap sides"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        {/* Right Selector */}
        <div className="flex-1 space-y-2 min-w-[220px]">
          <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Target (Right)</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-white/10 bg-black/40 font-mono text-xs hover:bg-black/60 transition-all py-6 rounded-xl">
                <span className="truncate">{rightNs} / {rightEnv}</span>
                <ChevronDown className="h-4 w-4 opacity-40 shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto w-64 bg-zinc-950 border-white/10">
              {allPairs.map((p) => (
                <DropdownMenuItem
                  key={`right-${p.namespace}/${p.environment}`}
                  className="font-mono text-xs focus:bg-violet-500/20 focus:text-violet-200"
                  onSelect={() => {
                    setRightNs(p.namespace);
                    setRightEnv(p.environment);
                  }}
                >
                  {p.namespace} / {p.environment}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          onClick={() => void runCompare()} 
          disabled={loading}
          className="mt-6 h-12 px-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all shadow-xl shadow-violet-900/40 active:scale-95"
        >
          {loading ? "Loading…" : "Compare Now"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
        </div>
      )}

      {!loading && (Object.keys(leftData).length > 0 || Object.keys(rightData).length > 0) && (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#080809] shadow-inner">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <th className="p-5">Variable Key</th>
                <th className="p-5 max-w-[160px] truncate text-violet-400/80">{leftNs}/{leftEnv}</th>
                <th className="p-5 max-w-[160px] truncate text-emerald-400/80">{rightNs}/{rightEnv}</th>
                <th className="p-5 text-right">Comparison</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.005, 0.4) }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="p-5 font-mono text-[11px] text-zinc-300 group-hover:text-white transition-colors">
                    {r.key}
                  </td>
                  <td className="max-w-[180px] truncate p-5 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-400">
                    {r.left ?? <span className="opacity-20 italic">missing</span>}
                  </td>
                  <td className="max-w-[180px] truncate p-5 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-400">
                    {r.right ?? <span className="opacity-20 italic">missing</span>}
                  </td>
                  <td className="p-5 text-right">
                    {r.kind === "same" && (
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Identical</span>
                    )}
                    {r.kind === "changed" && (
                      <Badge variant="warning" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0 text-[10px]">Mismatch</Badge>
                    )}
                    {r.kind === "only_left" && (
                      <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-2 py-0 text-[10px]">Left Only</Badge>
                    )}
                    {r.kind === "only_right" && (
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0 text-[10px]">Right Only</Badge>
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
