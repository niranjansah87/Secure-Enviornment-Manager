"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Bell, Home, Search, Command, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWorkspace } from "@/context/workspace-context";
import { CommandPalette } from "@/components/layout/command-palette";
import { envDotClass } from "@/lib/env-style";
import { cn } from "@/lib/utils";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

type Pair = { projectSlug: string; envSlug: string; label: string };

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, projects, workspace, selectWorkspace, environmentsFor } = useWorkspace();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);

  // Lazily build the full list of project/environment pairs for the switcher.
  const loadPairs = useCallback(async () => {
    if (projects.length === 0) return;
    setLoadingPairs(true);
    try {
      const nested = await Promise.all(
        projects.map(async (p) => {
          const envs = await environmentsFor(p.id).catch(() => []);
          return envs.map((e) => ({ projectSlug: p.slug, envSlug: e.slug, label: `${p.slug} / ${e.slug}` }));
        }),
      );
      setPairs(nested.flat());
    } finally {
      setLoadingPairs(false);
    }
  }, [projects, environmentsFor]);

  useEffect(() => {
    if (token && projects.length > 0) void loadPairs();
  }, [token, projects, loadPairs]);

  const breadcrumbs = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    return segs.map((segment, index) => ({
      href: "/" + segs.slice(0, index + 1).join("/"),
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      isLast: index === segs.length - 1,
    }));
  }, [pathname]);

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

  const goTo = (p: Pair | { projectSlug: string; envSlug: string }) => {
    selectWorkspace(p.projectSlug, p.envSlug);
    router.push(`/${p.projectSlug}/${p.envSlug}`);
  };

  return (
    <>
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        workspace={workspace}
        environments={pairs}
        onSelectWorkspace={goTo}
      />

      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-black/80 px-4 backdrop-blur-xl">
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
                      <BreadcrumbPage className="text-zinc-200 font-medium">{bc.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={bc.href} className="text-zinc-500 hover:text-white transition-colors">
                        {bc.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!bc.isLast && <BreadcrumbSeparator className="text-zinc-700 text-[10px]" />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <button
          onClick={() => setCmdOpen(true)}
          aria-label="Search secrets and projects (Ctrl+K)"
          className="hidden md:flex items-center gap-2 h-9 w-72 rounded-lg border border-white/8 bg-white/[0.03] px-3 text-xs text-zinc-500 hover:bg-white/[0.06] hover:border-white/12 hover:text-zinc-400 transition-all group"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search secrets, projects…</span>
          <span className="flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 group-hover:border-white/15 group-hover:text-zinc-500 transition-colors">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Workspace selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-[152px] justify-between border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white transition-all rounded-lg text-xs font-mono gap-2"
                disabled={!token}
              >
                {workspace ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", envDotClass(workspace.envSlug))} />
                    {workspace.projectSlug} / {workspace.envSlug}
                  </span>
                ) : (
                  <span className="text-zinc-600">Select workspace</span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-xl">
              <DropdownMenuLabel className="text-zinc-500 text-[10px] uppercase tracking-wider px-2 py-1.5">
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <div className="max-h-72 overflow-y-auto py-1">
                {loadingPairs && pairs.length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-600">Loading…</div>
                )}
                {!loadingPairs && pairs.length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-600 italic">No environments yet.</div>
                )}
                {pairs.map((p) => {
                  const active = workspace?.projectSlug === p.projectSlug && workspace?.envSlug === p.envSlug;
                  return (
                    <DropdownMenuItem
                      key={p.label}
                      className={cn(
                        "px-3 py-2 text-xs font-mono cursor-pointer",
                        active ? "text-white bg-white/8" : "text-zinc-400 hover:text-white focus:bg-white/5",
                      )}
                      onSelect={() => goTo(p)}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 mr-2", envDotClass(p.envSlug))} />
                      <span className="flex-1 truncate">{p.label}</span>
                      {active && <Check className="h-3 w-3 text-violet-400" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-white/8 mx-0.5" />

          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg relative"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-xl">
              <DropdownMenuLabel className="text-zinc-300 text-xs">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <div className="px-3 py-6 text-center text-xs text-zinc-600">You&rsquo;re all caught up.</div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
