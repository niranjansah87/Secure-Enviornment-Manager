"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Key, Clock, ArrowRight } from "lucide-react";
import { api, ApiError, type AuditEntry } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIso } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { token, workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    environment_count: number;
    secret_count: number;
    last_updated: string | null;
    recent_activity: AuditEntry[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStats(null);
      setLoading(false);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void api
      .metaStats(token)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof ApiError ? e.message : "Failed to load stats");
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-zinc-500">Overview</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Workspace health
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aggregated across environments your API token can access.
        </p>
      </div>

      {!token && (
        <Card className="border-zinc-800 bg-[#111827]">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-zinc-100">Connect your backend</p>
              <p className="text-sm text-zinc-500">
                Add a Bearer token from <code className="text-violet-300">api_keys.json</code>{" "}
                or set <code className="text-violet-300">MASTER_API_TOKEN</code> on the server.
              </p>
            </div>
            <Button asChild>
              <Link href="/projects">Browse projects</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : err ? (
          <div className="col-span-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {err}
          </div>
        ) : stats ? (
          <>
            <StatCard
              title="Environments"
              value={String(stats.environment_count)}
              hint="Unique namespace / env pairs"
              icon={Layers}
            />
            <StatCard
              title="Secrets"
              value={String(stats.secret_count)}
              hint="Total variables stored"
              icon={Key}
            />
            <StatCard
              title="Last updated"
              value={
                stats.last_updated ? formatIso(stats.last_updated) : "—"
              }
              hint="Latest file change across envs"
              icon={Clock}
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-[#111827]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Recent activity
            </CardTitle>
            {workspace && (
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`/${workspace.namespace}/${workspace.environment}/audit`}
                >
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!token ? (
              <p className="text-sm text-zinc-500">Configure a token to see audit previews.</p>
            ) : loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !stats?.recent_activity?.length ? (
              <p className="text-sm text-zinc-500">No recent events.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recent_activity.slice(0, 8).map((a, i) => (
                  <motion.li
                    key={`${a.timestamp}-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0"
                  >
                    <Badge variant="secondary" className="text-[10px]">
                      {a.action}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {a.namespace}/{a.environment}
                    </span>
                    <span className="ml-auto text-xs text-zinc-600">
                      {formatIso(a.timestamp)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-[#111827]">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="secondary" asChild className="justify-between">
              <Link href="/projects">
                Browse projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="justify-between"
              disabled={!workspace}
            >
              <Link
                href={
                  workspace
                    ? `/${workspace.namespace}/${workspace.environment}`
                    : "#"
                }
              >
                Open secrets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild 
              className="justify-between"
              disabled={!workspace}
            >
              <Link href={workspace ? `/${workspace.namespace}/${workspace.environment}/templates` : "#"}>
                Browse templates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
