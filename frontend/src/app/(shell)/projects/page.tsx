"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/context/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/forms/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const { environments, token, loadingEnvs, envError, setWorkspace } =
    useWorkspace();

  const pairs: { namespace: string; environment: string }[] = [];
  for (const [ns, envs] of Object.entries(environments)) {
    for (const e of envs) {
      pairs.push({ namespace: ns, environment: e });
    }
  }

  if (!token) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No API token"
        description="Add your Bearer token in Settings to list environments from the Flask API."
        actionLabel="Go to settings"
        actionHref="/settings"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">Projects</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Namespaces and environments exposed to your token.
        </p>
      </div>

      {loadingEnvs && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}

      {envError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {envError}
        </p>
      )}

      {!loadingEnvs && pairs.length === 0 && !envError && (
        <EmptyState
          icon={FolderOpen}
          title="No environments"
          description="Create encrypted .enc files under data/&lt;namespace&gt;/ on the server, then refresh."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((p, i) => (
          <motion.div
            key={`${p.namespace}/${p.environment}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="h-full border-zinc-800 bg-[#111827] transition-shadow hover:shadow-lg hover:shadow-violet-500/5">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-zinc-100">
                      {p.namespace}
                    </p>
                    <Badge variant="secondary" className="mt-2 font-mono text-[10px]">
                      {p.environment}
                    </Badge>
                  </div>
                  <FolderOpen className="h-5 w-5 text-zinc-600" />
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link
                    href={`/${p.namespace}/${p.environment}`}
                    onClick={() => setWorkspace(p)}
                  >
                    Open workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
