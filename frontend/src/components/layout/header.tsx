"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/context/workspace-context";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { pageTitle } from "@/lib/page-titles";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const {
    workspace,
    setWorkspace,
    environments,
    loadingEnvs,
    envError,
    token,
  } = useWorkspace();

  const pairs: { namespace: string; environment: string }[] = [];
  for (const [ns, envs] of Object.entries(environments)) {
    for (const e of envs) {
      pairs.push({ namespace: ns, environment: e });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-[#0B0F19]/90 px-6 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[200px] justify-between border-zinc-700 bg-[#111827] text-zinc-200"
              disabled={!token || pairs.length === 0}
            >
              {loadingEnvs ? (
                <Skeleton className="h-4 w-32" />
              ) : workspace ? (
                <span className="truncate font-mono text-xs">
                  {workspace.namespace} / {workspace.environment}
                </span>
              ) : (
                <span className="text-zinc-500">Select environment</span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-zinc-500">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!token && (
              <div className="px-2 py-2 text-xs text-zinc-500">
                Configure API token in Settings.
              </div>
            )}
            {envError && token && (
              <div className="px-2 py-2 text-xs text-red-400">{envError}</div>
            )}
            {pairs.map((p) => (
              <DropdownMenuItem
                key={`${p.namespace}/${p.environment}`}
                className="font-mono text-xs"
                onSelect={() => {
                  setWorkspace(p);
                  router.push(`/${p.namespace}/${p.environment}`);
                }}
              >
                {p.namespace} / {p.environment}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" asChild className="text-zinc-400">
          <Link
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
            target="_blank"
            rel="noreferrer"
            title="Repository"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
