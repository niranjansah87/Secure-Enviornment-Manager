"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { SecretsTable } from "@/components/tables/secrets-table";
import { EmptyState } from "@/components/forms/empty-state";
import {
  KeyRound,
  Plus,
  Upload,
  ShieldCheck,
  Layers,
  Clock,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatIso } from "@/lib/utils";

const ENV_DOT: Record<string, string> = {
  production: "bg-green-400 shadow-green-400/50",
  staging: "bg-orange-400 shadow-orange-400/50",
  development: "bg-blue-400 shadow-blue-400/50",
  dev: "bg-blue-400 shadow-blue-400/50",
  preview: "bg-purple-400 shadow-purple-400/50",
  test: "bg-yellow-400 shadow-yellow-400/50",
};

function envDot(env: string) {
  return ENV_DOT[env.toLowerCase()] ?? "bg-zinc-400";
}

export default function SecretsPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace, environment } = use(params);
  const { token, environments, setWorkspace } = useWorkspace();
  const router = useRouter();
  const [vars, setVars] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get all environments for this namespace
  const nsEnvs = environments[namespace] ?? [];

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
        description="Configure your Bearer token to load secrets."
        actionLabel="Go to login"
        actionHref="/login"
      />
    );
  }

  const secretCount = Object.keys(vars).length;

  return (
    <div>
      {/* Hero with environment tabs */}
      <div className="relative mb-6 overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <Image
            src="/admin_header_image.png"
            alt=""
            fill
            className="object-cover object-center opacity-25"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        </div>

        <div className="relative z-10 px-7 pt-7 pb-0">
          {/* Page title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Secrets</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage sensitive information for your environments. Store, search, and organize your secrets securely.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm px-4 py-2 text-sm text-zinc-300">
                <Lock className="h-4 w-4 text-violet-400" />
                <span>Keep your secrets secure</span>
              </div>
            </div>
          </div>

          {/* Environment tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0 [&::-webkit-scrollbar]:hidden">
            {nsEnvs.map((env) => {
              const isActive = env === environment;
              return (
                <Link
                  key={env}
                  href={`/${namespace}/${env}`}
                  onClick={() => setWorkspace({ namespace, environment: env })}
                  className={cn(
                    "flex items-center gap-2 rounded-t-xl border-t border-l border-r px-5 py-3 text-sm font-medium transition-all shrink-0",
                    isActive
                      ? "border-white/10 bg-[#060608] text-white shadow-lg"
                      : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shadow-[0_0_6px]",
                      envDot(env)
                    )}
                  />
                  <span className="capitalize">{env}</span>
                  {!loading && isActive && (
                    <span className="text-[10px] text-zinc-500 font-normal ml-0.5">
                      {secretCount} secrets
                    </span>
                  )}
                </Link>
              );
            })}
            <button className="flex items-center gap-1.5 px-4 py-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
              <Plus className="h-3.5 w-3.5" />
              Add environment
            </button>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            icon: KeyRound,
            value: loading ? "—" : String(secretCount),
            label: "Total secrets",
            color: "text-violet-400 bg-violet-400/10",
            extra: loading ? null : <span className="text-[10px] text-green-400 ml-1">↑ 12%</span>,
          },
          {
            icon: ShieldCheck,
            value: "100%",
            label: "Encrypted",
            color: "text-emerald-400 bg-emerald-400/10",
            extra: <span className="text-[10px] text-emerald-500 border border-emerald-500/20 bg-emerald-500/10 rounded px-1.5 py-0.5 font-mono ml-1">AES-256</span>,
          },
          {
            icon: Layers,
            value: String(nsEnvs.length),
            label: "Environments",
            color: "text-blue-400 bg-blue-400/10",
            extra: null,
          },
          {
            icon: Clock,
            value: loading ? "—" : (lastUpdated ? "Updated" : "Never"),
            label: "Last update",
            color: "text-orange-400 bg-orange-400/10",
            extra: null,
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0d0f18] px-4 py-3.5"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline">
                  <span className="text-lg font-bold text-white leading-none">{s.value}</span>
                  {s.extra}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-96 w-full rounded-xl bg-white/5" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {error}
        </div>
      ) : (
        <SecretsTable
          token={token}
          namespace={namespace}
          environment={environment}
          variables={vars}
          lastUpdated={lastUpdated}
          onRefresh={() => void load()}
        />
      )}
    </div>
  );
}
