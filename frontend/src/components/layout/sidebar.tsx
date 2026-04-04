"use client";

import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";

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
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
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
  if (label === "Analytics") return pathname === "/analytics";
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
      className="relative z-40 flex h-full shrink-0 flex-col border-r border-white/5 bg-[#030303] shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex h-24 items-center justify-center border-b border-white/5">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
          >
            <NextImage
              src="/logo.png"
              width={64}
              height={64}
              alt="Secure Environment Manager"
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
              unoptimized
            />
          </motion.div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <nav className="flex flex-col gap-1.5">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = navActive(label, pathname, workspace);

            return (
              <Link key={label} href={href} title={label} className="relative group">
                <motion.div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                    isActive
                      ? "text-white bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isActive ? "text-violet-400" : "group-hover:text-zinc-200")} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="truncate"
                    >
                      {label}
                    </motion.span>
                  )}
                  
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-glow"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-500 blur-[2px] mr-2"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-white/5 bg-[#050505]/50 backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
               "w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors",
               collapsed ? "px-0 justify-center" : "px-3"
            )}
            onClick={() => {
              setToken("");
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Log Out</span>}
          </Button>
          
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
               "w-full justify-start text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
               collapsed ? "px-0 justify-center" : "px-3"
            )}
            onClick={toggle}
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
            />
            {!collapsed && <span className="ml-3 text-sm">Collapse Sidebar</span>}
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}

