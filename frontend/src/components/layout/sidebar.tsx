"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Shield,
  LayoutTemplate,
  ChevronLeft,
  GitCompare,
  LogOut,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sem_sidebar_collapsed";

const nav = (
  workspace: { namespace: string; environment: string } | null
) => {
  const base =
    workspace != null
      ? `/${workspace.namespace}/${workspace.environment}`
      : null;
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    {
      href: base ?? "/projects",
      label: "Secrets",
      icon: KeyRound,
    },
    {
      href: base ? `${base}/compare` : "/projects",
      label: "Compare",
      icon: GitCompare,
    },
    {
      href: base ? `${base}/history` : "/projects",
      label: "History",
      icon: History,
    },
    {
      href: base ? `${base}/audit` : "/projects",
      label: "Audit Logs",
      icon: Shield,
    },
    {
      href: base ? `${base}/templates` : "/projects",
      label: "Templates",
      icon: LayoutTemplate,
    },
  ];
};

function navActive(
  label: string,
  pathname: string,
  workspace: { namespace: string; environment: string } | null
) {
  if (label === "Dashboard") return pathname === "/dashboard";
  if (label === "Projects") return pathname === "/projects";
  if (!workspace) return false;
  const p = `/${workspace.namespace}/${workspace.environment}`;
  if (label === "Secrets") return pathname === p;
  if (label === "Compare") return pathname === `${p}/compare`;
  if (label === "History") return pathname === `${p}/history`;
  if (label === "Audit Logs") return pathname === `${p}/audit`;
  if (label === "Templates") return pathname === `${p}/templates`;
  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, setToken } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const items = nav(workspace);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: "spring", damping: 24, stiffness: 200 }}
      className="relative z-40 flex h-full shrink-0 flex-col rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-2xl shadow-[8px_0_24px_rgba(0,0,0,0.4)] overflow-hidden"
    >
      <div className="flex h-20 items-center justify-center border-b border-white/5">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center justify-center rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
          >
            <Image
              src="/logo.png"
              width={48}
              height={48}
              alt="Secure Environment Manager"
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
              unoptimized
            />
          </motion.div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = navActive(label, pathname, workspace);

          return (
            <Link key={label} href={href} title={label} className="relative block">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                whileHover={{ x: isActive ? 0 : 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ml-1",
                  isActive
                    ? "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-violet-400" : "")} />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.1 } }}
                      className="truncate ml-1"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-zinc-800" />
      <div className="p-2 flex flex-col gap-1">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={() => {
            setToken("");
            router.push("/login");
          }}
          type="button"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-colors" />
          {!collapsed && <span className="ml-2 font-medium">Log Out</span>}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start text-zinc-400"
          onClick={toggle}
          type="button"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
