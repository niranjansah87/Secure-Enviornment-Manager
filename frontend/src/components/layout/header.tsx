"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Bell,
  Sun,
  Home,
  Search,
  Command,
} from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/command-palette";

const ENV_COLORS: Record<string, string> = {
  production: "bg-green-400",
  staging: "bg-orange-400",
  development: "bg-blue-400",
  dev: "bg-blue-400",
  preview: "bg-purple-400",
  test: "bg-yellow-400",
};

function envColor(env: string) {
  return ENV_COLORS[env.toLowerCase()] ?? "bg-zinc-400";
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    workspace,
    setWorkspace,
    environments,
    loadingEnvs,
    envError,
    token,
    username,
  } = useWorkspace();
  const [cmdOpen, setCmdOpen] = useState(false);

  const pairs: { namespace: string; environment: string }[] = [];
  for (const [ns, envs] of Object.entries(environments)) {
    for (const e of envs) {
      pairs.push({ namespace: ns, environment: e });
    }
  }

  // Breadcrumb
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const isLast = index === pathSegments.length - 1;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label, isLast };
  });

  // Cmd+K opens command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((o) => !o);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        workspace={workspace}
        environments={pairs}
        onSelectWorkspace={(p) => {
          setWorkspace(p);
          router.push(`/${p.namespace}/${p.environment}`);
        }}
      />

      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-black/80 px-4 backdrop-blur-xl">
        {/* Left: home + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
            aria-label="Go to dashboard"
            title="Dashboard"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList className="text-xs">
              {breadcrumbs.map((bc) => (
                <React.Fragment key={bc.href}>
                  <BreadcrumbItem>
                    {bc.isLast ? (
                      <BreadcrumbPage className="text-zinc-200 font-medium">
                        {bc.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={bc.href}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        {bc.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!bc.isLast && (
                    <BreadcrumbSeparator className="text-zinc-700 text-[10px]" />
                  )}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center: Search */}
        <button
          onClick={() => setCmdOpen(true)}
          aria-label="Search secrets, projects (Ctrl+K)"
          className="hidden md:flex items-center gap-2 h-9 w-72 rounded-lg border border-white/8 bg-white/[0.03] px-3 text-xs text-zinc-500 hover:bg-white/[0.06] hover:border-white/12 hover:text-zinc-400 transition-all group"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search secrets, projects...</span>
          <span className="flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 group-hover:border-white/15 group-hover:text-zinc-500 transition-colors">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </button>

        {/* Right: workspace + icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Workspace selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-[152px] justify-between border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white transition-all rounded-lg text-xs font-mono gap-2"
                disabled={!token || pairs.length === 0}
              >
                {loadingEnvs ? (
                  <Skeleton className="h-3 w-20 bg-white/10" />
                ) : workspace ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        envColor(workspace.environment)
                      )}
                    />
                    {workspace.namespace} / {workspace.environment}
                  </span>
                ) : (
                  <span className="text-zinc-600">Select workspace</span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-zinc-500 text-[10px] uppercase tracking-wider px-2 py-1.5">
                Environments
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {!token && (
                <div className="px-3 py-2 text-xs text-zinc-500 italic">
                  No active session.
                </div>
              )}
              {envError && token && (
                <div className="px-3 py-2 text-xs text-red-400/80">
                  {envError}
                </div>
              )}
              <div className="max-h-72 overflow-y-auto py-1">
                {pairs.map((p) => {
                  const active =
                    workspace?.namespace === p.namespace &&
                    workspace?.environment === p.environment;
                  return (
                    <DropdownMenuItem
                      key={`${p.namespace}/${p.environment}`}
                      className={cn(
                        "px-3 py-2 text-xs font-mono cursor-pointer",
                        active
                          ? "text-white bg-white/8"
                          : "text-zinc-400 hover:text-white focus:bg-white/5"
                      )}
                      onSelect={() => {
                        setWorkspace(p);
                        router.push(`/${p.namespace}/${p.environment}`);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            envColor(p.environment)
                          )}
                        />
                        <span className="flex-1 truncate">
                          {p.namespace} / {p.environment}
                        </span>
                        {active && (
                          <div className="h-1 w-1 rounded-full bg-violet-500" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-white/8 mx-0.5" />

          {/* GitHub */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg"
          >
            <Link
              href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository (opens in new tab)"
              title="GitHub"
            >
              <GithubIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg relative"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg"
          >
            <Sun className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* User avatar */}
          {token && (
            <div className="h-7 w-7 rounded-full bg-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 cursor-pointer hover:bg-violet-500 transition-colors ml-0.5">
              {username ? username.slice(0, 2).toUpperCase() : "NS"}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
