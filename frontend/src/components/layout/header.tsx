"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  Bell,
  Search,
  Command,
  Check,
  Sun,
  Moon,
} from "lucide-react";
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
  const { token, projects, workspace, selectWorkspace, environmentsFor, displayName } = useWorkspace();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Lazily build the full list of project/environment pairs for the switcher
  const loadPairs = useCallback(async () => {
    if (projects.length === 0) return;
    setLoadingPairs(true);
    try {
      const nested = await Promise.all(
        projects.map(async (p) => {
          const envs = await environmentsFor(p.id).catch(() => []);
          return envs.map((e) => ({
            projectSlug: p.slug,
            envSlug: e.slug,
            label: `${p.slug} / ${e.slug}`,
          }));
        })
      );
      setPairs(nested.flat());
    } finally {
      setLoadingPairs(false);
    }
  }, [projects, environmentsFor]);

  useEffect(() => {
    if (token && projects.length > 0) void loadPairs();
  }, [token, projects, loadPairs]);

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

      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#07090e]/85 px-6 backdrop-blur-xl">
        {/* Search Input Bar (Matching Reference Design) */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setCmdOpen(true)}
            aria-label="Search secrets, projects, environments (Ctrl+K)"
            className="flex items-center gap-2.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[#0d121f]/70 px-3.5 text-xs text-zinc-400 hover:bg-[#12192b] hover:border-blue-500/30 hover:text-zinc-200 transition-all group shadow-inner"
          >
            <Search className="h-4 w-4 text-zinc-400 group-hover:text-blue-400 transition-colors shrink-0" />
            <span className="flex-1 text-left truncate">Search secrets, projects, environments...</span>
            <span className="flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 group-hover:border-blue-400/30 group-hover:text-zinc-300 transition-colors">
              <Command className="h-2.5 w-2.5" /> K
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Workspace Pill Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 h-9 px-3 rounded-xl border border-white/[0.08] bg-[#0d121f]/80 text-zinc-200 hover:bg-[#131b2e] hover:border-blue-500/30 transition-all text-xs font-medium shadow-sm"
                disabled={!token}
              >
                {/* Decorative Diamond Icon */}
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-amber-500 to-orange-400 shadow-sm shrink-0">
                  <div className="h-2 w-2 rotate-45 bg-white/90 rounded-xs" />
                </div>
                {workspace ? (
                  <span className="truncate max-w-[150px]">
                    {workspace.projectSlug} <span className="text-zinc-500">/</span> {workspace.envSlug}
                  </span>
                ) : (
                  <span className="text-zinc-400">Select workspace</span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[#0c101a]/95 border-white/[0.1] shadow-2xl backdrop-blur-xl rounded-xl p-1.5">
              <DropdownMenuLabel className="text-zinc-400 text-[10px] uppercase tracking-wider px-2 py-1">
                Select Workspace & Environment
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <div className="max-h-72 overflow-y-auto py-1">
                {loadingPairs && pairs.length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-500">Loading workspaces…</div>
                )}
                {!loadingPairs && pairs.length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-500 italic">No environments found.</div>
                )}
                {pairs.map((p) => {
                  const active = workspace?.projectSlug === p.projectSlug && workspace?.envSlug === p.envSlug;
                  return (
                    <DropdownMenuItem
                      key={p.label}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-mono cursor-pointer rounded-lg",
                        active ? "text-white bg-blue-600/20 border border-blue-500/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                      )}
                      onSelect={() => goTo(p)}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0 shadow-sm", envDotClass(p.envSlug))} />
                      <span className="flex-1 truncate">{p.label}</span>
                      {active && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-white/[0.08] mx-0.5" />

          {/* GitHub Repo */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl"
          >
            <Link
              href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
            >
              <GithubIcon className="h-4 w-4" />
            </Link>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#07090e]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#0c101a]/95 border-white/[0.1] shadow-2xl backdrop-blur-xl rounded-xl p-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-xs font-semibold text-zinc-200">Notifications</span>
                <span className="text-[10px] text-blue-400 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="py-6 text-center text-xs text-zinc-500">
                All systems operating normally. Tamper seals verified.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Light/Dark Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark((d) => !d)}
            aria-label="Toggle theme"
            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl"
          >
            {isDark ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
          </Button>

          {/* User Avatar Circle */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 text-xs font-bold text-white shadow-md">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>
    </>
  );
}
