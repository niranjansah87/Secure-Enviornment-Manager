/**
 * Shared colour mapping for environments, by slug/name.
 * Keeps the production=green / staging=amber / dev=blue / preview=violet
 * language consistent across the sidebar, header, tables and charts.
 */

type EnvKind = "production" | "staging" | "development" | "preview" | "other";

function kindOf(env: string): EnvKind {
  const e = env.toLowerCase();
  if (e === "production" || e === "prod") return "production";
  if (e === "staging" || e === "stage") return "staging";
  if (e === "development" || e === "dev") return "development";
  if (e === "preview") return "preview";
  return "other";
}

const DOT: Record<EnvKind, string> = {
  production: "bg-emerald-400 shadow-emerald-400/50",
  staging: "bg-amber-400 shadow-amber-400/50",
  development: "bg-blue-400 shadow-blue-400/50",
  preview: "bg-violet-400 shadow-violet-400/50",
  other: "bg-zinc-400",
};

const TEXT: Record<EnvKind, string> = {
  production: "text-emerald-400",
  staging: "text-amber-400",
  development: "text-blue-400",
  preview: "text-violet-400",
  other: "text-zinc-400",
};

const BADGE: Record<EnvKind, string> = {
  production: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  staging: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  development: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  preview: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  other: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
};

/** Hex colours for charts (Recharts can't use Tailwind classes). */
const HEX: Record<EnvKind, string> = {
  production: "#34d399",
  staging: "#fbbf24",
  development: "#60a5fa",
  preview: "#a78bfa",
  other: "#a1a1aa",
};

export function envDotClass(env: string): string {
  return DOT[kindOf(env)];
}

export function envTextClass(env: string): string {
  return TEXT[kindOf(env)];
}

export function envBadgeClass(env: string): string {
  return BADGE[kindOf(env)];
}

export function envHex(env: string): string {
  return HEX[kindOf(env)];
}
