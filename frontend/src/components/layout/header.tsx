"use client";

import React from "react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  // Simple breadcrumb logic based on pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const isLast = index === pathSegments.length - 1;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return { href, label, isLast };
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/5 bg-black/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4 min-w-0">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                SEM
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.length > 0 && <BreadcrumbSeparator className="text-zinc-700" />}
            {breadcrumbs.map((bc) => (
              <React.Fragment key={bc.href}>
                <BreadcrumbItem>
                  {bc.isLast ? (
                    <BreadcrumbPage className="text-zinc-100 font-medium">{bc.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={bc.href} className="text-zinc-400 hover:text-white transition-colors">
                      {bc.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!bc.isLast && <BreadcrumbSeparator className="text-zinc-700" />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Mobile Title */}
        <h1 className="md:hidden truncate text-sm font-semibold text-zinc-100">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-[180px] justify-between border-white/5 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all rounded-lg text-xs font-mono"
              disabled={!token || pairs.length === 0}
            >
              {loadingEnvs ? (
                <Skeleton className="h-3 w-24 bg-white/10" />
              ) : workspace ? (
                <span className="truncate">
                  {workspace.namespace} / {workspace.environment}
                </span>
              ) : (
                <span className="text-zinc-500">Pick workspace...</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 shadow-2xl">
            <DropdownMenuLabel className="text-zinc-500 text-[10px] uppercase tracking-wider px-2 py-1.5">
              Available Environments
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {!token && (
              <div className="px-3 py-3 text-xs text-zinc-500 italic">
                No active session found.
              </div>
            )}
            {envError && token && (
              <div className="px-3 py-3 text-xs text-red-400/80">{envError}</div>
            )}
            <div className="max-h-[300px] overflow-y-auto py-1">
              {pairs.map((p) => (
                <DropdownMenuItem
                  key={`${p.namespace}/${p.environment}`}
                  className="px-3 py-2 text-xs font-mono text-zinc-400 hover:text-white focus:bg-white/5 cursor-pointer"
                  onSelect={() => {
                    setWorkspace(p);
                    router.push(`/${p.namespace}/${p.environment}`);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{p.namespace} / {p.environment}</span>
                    {workspace?.namespace === p.namespace && workspace?.environment === p.environment && (
                      <div className="h-1 w-1 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

        <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <Link
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
            target="_blank"
            rel="noreferrer"
            title="Source Code"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        
        <Avatar className="h-8 w-8 border border-white/10 cursor-pointer hover:border-violet-500/50 transition-colors">
          <AvatarImage src="https://github.com/niranjansah87.png" alt="Niranjan Sah" />
          <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">NS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
