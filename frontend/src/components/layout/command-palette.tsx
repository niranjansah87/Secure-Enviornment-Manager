"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  GitCompare,
  History,
  Shield,
  LayoutTemplate,
  BarChart3,
  Users,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Workspace = { namespace: string; environment: string };

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  environments: Workspace[];
  onSelectWorkspace: (w: Workspace) => void;
};

export function CommandPalette({
  open,
  onClose,
  workspace,
  environments,
  onSelectWorkspace,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const base = workspace ? `/${workspace.namespace}/${workspace.environment}` : null;

  const staticItems: CommandItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Overview and stats",
      icon: LayoutDashboard,
      action: () => router.push("/dashboard"),
      category: "Navigation",
    },
    {
      id: "projects",
      label: "Projects",
      description: "Browse all workspaces",
      icon: FolderKanban,
      action: () => router.push("/projects"),
      category: "Navigation",
    },
    ...(base
      ? [
          {
            id: "secrets",
            label: "Open Secrets",
            description: `${workspace!.namespace}/${workspace!.environment}`,
            icon: KeyRound,
            action: () => router.push(base!),
            category: "Workspace",
          },
          {
            id: "compare",
            label: "Compare Environments",
            description: "Find configuration differences",
            icon: GitCompare,
            action: () => router.push(`${base}/compare`),
            category: "Workspace",
          },
          {
            id: "history",
            label: "View History",
            description: "Secret version history",
            icon: History,
            action: () => router.push(`${base}/history`),
            category: "Workspace",
          },
          {
            id: "audit",
            label: "Audit Logs",
            description: "Activity and access logs",
            icon: Shield,
            action: () => router.push(`${base}/audit`),
            category: "Workspace",
          },
          {
            id: "templates",
            label: "Templates",
            description: "Environment templates",
            icon: LayoutTemplate,
            action: () => router.push(`${base}/templates`),
            category: "Workspace",
          },
        ]
      : []),
    {
      id: "analytics",
      label: "Analytics",
      description: "Usage insights and trends",
      icon: BarChart3,
      action: () => router.push("/analytics"),
      category: "Observe",
    },
    {
      id: "apikeys",
      label: "API Keys",
      description: "Manage access tokens",
      icon: KeyRound,
      action: () => router.push("/apikeys"),
      category: "Access",
    },
    {
      id: "users",
      label: "Users",
      description: "Team member management",
      icon: Users,
      action: () => router.push("/admin/users"),
      category: "Access",
    },
  ];

  // Workspace switcher items
  const wsItems: CommandItem[] = environments.map((e) => ({
    id: `ws-${e.namespace}-${e.environment}`,
    label: `${e.namespace} / ${e.environment}`,
    description: "Switch workspace",
    icon: FolderKanban,
    action: () => onSelectWorkspace(e),
    category: "Switch Workspace",
  }));

  const allItems = [...staticItems, ...wsItems];

  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      const item = filtered[selected];
      if (item) {
        item.action();
        onClose();
      }
    }
  };

  // Group by category
  const grouped: Record<string, CommandItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  let flatIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-2xl">
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                <Search className="h-4 w-4 text-zinc-500 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search secrets, projects, commands..."
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
                />
                <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                className="max-h-80 overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden"
                onKeyDown={handleKeyDown}
              >
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-600">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        {category}
                      </div>
                      {items.map((item) => {
                        const idx = flatIndex++;
                        const isSelected = idx === selected;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isSelected
                                ? "bg-white/8 text-white"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            )}
                            onClick={() => {
                              item.action();
                              onClose();
                            }}
                            onMouseEnter={() => setSelected(idx)}
                          >
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                isSelected
                                  ? "border-white/15 bg-white/10"
                                  : "border-white/8 bg-white/5"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium leading-none">
                                {item.label}
                              </div>
                              {item.description && (
                                <div className="mt-0.5 text-[11px] text-zinc-600 truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            <ArrowRight
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-opacity",
                                isSelected ? "opacity-50" : "opacity-0"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-white/8 px-4 py-2">
                <div className="flex items-center gap-1 text-[10px] text-zinc-700">
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">↑</kbd>
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-700">
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">↵</kbd>
                  <span className="ml-1">Select</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
