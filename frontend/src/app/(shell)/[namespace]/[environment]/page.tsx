"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { SecretsTable } from "@/components/tables/secrets-table";
import { EmptyState } from "@/components/forms/empty-state";
import { KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecretsPage({
  params,
}: {
  params: { namespace: string; environment: string };
}) {
  const { namespace, environment } = params;
  const { token } = useWorkspace();
  const [vars, setVars] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [secrets, meta] = await Promise.all([
        api.getSecrets(token, namespace, environment),
        api.getMeta(token, namespace, environment),
      ]);
      if ("error" in secrets && typeof (secrets as { error: string }).error === "string") {
        setError((secrets as { error: string }).error);
        setVars({});
      } else {
        setVars(secrets as Record<string, string>);
      }
      setLastUpdated(meta.last_updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load secrets");
      setVars({});
    } finally {
      setLoading(false);
    }
  }, [token, namespace, environment]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) {
    return (
      <EmptyState
        icon={KeyRound}
        title="API token required"
        description="Configure your Bearer token in Settings to load secrets."
        actionLabel="Settings"
        actionHref="/settings"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">Workspace</p>
        <h2 className="font-mono text-xl font-semibold text-zinc-100">
          {namespace} / {environment}
        </h2>
      </div>
      <SecretsTable
        token={token}
        namespace={namespace}
        environment={environment}
        variables={vars}
        lastUpdated={lastUpdated}
        onRefresh={() => void load()}
      />
    </div>
  );
}
