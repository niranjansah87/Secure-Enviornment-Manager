"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Shield,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  LogOut,
  History,
  BarChart3,
  Users,
  Lock,
  ShieldCheck,
  UserCog,
  MoreHorizontal,
  ShieldHalf,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { envDotClass } from "@/lib/env-style";
import { useWorkspace } from "@/context/workspace-context";
import { ApiError } from "@/lib/sem-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "sem_sidebar_collapsed";

type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = { label?: string; items: NavItem[] };

function buildNav(base: string | null, isAdmin: boolean): NavSection[] {
  const ws = (suffix: string) => (base ? `${base}${suffix}` : "/projects");

  const main: NavItem[] = [
    { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "projects", href: "/projects", label: "Projects", icon: FolderKanban },
    { key: "secrets", href: ws(""), label: "Secrets", icon: KeyRound },
    { key: "compare", href: ws("/compare"), label: "Compare", icon: GitCompare },
    { key: "history", href: ws("/history"), label: "History", icon: History },
    { key: "audit", href: ws("/audit"), label: "Audit Logs", icon: Shield },
    { key: "templates", href: ws("/templates"), label: "Templates", icon: LayoutTemplate },
    { key: "settings", href: ws("/settings"), label: "Settings", icon: Settings },
  ];

  const observe: NavItem[] = [{ key: "analytics", href: "/analytics", label: "Analytics", icon: BarChart3 }];

  const sections: NavSection[] = [{ items: main }, { label: "OBSERVE", items: observe }];

  if (isAdmin) {
    sections.push({
      label: "ACCESS",
      items: [
        { key: "apikeys", href: "/apikeys", label: "API Keys", icon: KeyRound },
        { key: "users", href: "/admin/users", label: "Users", icon: Users },
      ],
    });
  }
  return sections;
}

function isNavActive(key: string, pathname: string, base: string | null): boolean {
  switch (key) {
    case "dashboard":
      return pathname === "/dashboard";
    case "projects":
      return pathname === "/projects";
    case "analytics":
      return pathname === "/analytics";
    case "apikeys":
      return pathname === "/apikeys";
    case "users":
      return pathname.startsWith("/admin/users");
  }
  if (!base) return false;
  if (key === "secrets") return pathname === base;
  if (key === "compare") return pathname === `${base}/compare`;
  if (key === "history") return pathname === `${base}/history`;
  if (key === "audit") return pathname === `${base}/audit`;
  if (key === "templates") return pathname === `${base}/templates`;
  if (key === "settings") return pathname === `${base}/settings`;
  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, token, isAdmin, displayName, me, org, changePassword, logout } = useWorkspace();

  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const base = workspace ? `/${workspace.projectSlug}/${workspace.envSlug}` : null;
  const roleLabel = isAdmin ? "Administrator" : me?.role ? me.role[0].toUpperCase() + me.role.slice(1) : "Developer";

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
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

  const resetPwdDialog = () => {
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPwd.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword(currentPwd, newPwd);
      setShowChangePwd(false);
      resetPwdDialog();
      toast.success("Password changed. Other sessions were signed out.");
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const sections = buildNav(base, isAdmin);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="relative z-40 flex h-full shrink-0 flex-col border-r border-white/5 bg-[#060608] shadow-[2px_0_24px_rgba(0,0,0,0.5)]"
    >
      {/* Logo */}
      <div className={cn("flex items-center border-b border-white/5 h-[72px]", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        {collapsed ? (
          <button onClick={toggle} aria-label="Expand sidebar" className="group relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
            <ShieldHalf className="h-5 w-5 text-white group-hover:opacity-0 transition-opacity" />
            <ChevronRight className="absolute h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-900/30">
                <ShieldHalf className="h-5 w-5 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate leading-none">SEM</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">Secure Environment Manager</p>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Collapse sidebar" className="h-7 w-7 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-md shrink-0">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && !collapsed && (
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">{section.label}</div>
            )}
            {section.label && collapsed && <div className="h-px bg-white/5 mx-1 my-2" />}
            <nav className="flex flex-col gap-0.5">
              {section.items.map(({ key, href, label, icon: Icon }) => {
                const active = isNavActive(key, pathname, base);
                return (
                  <Link key={key} href={href} title={collapsed ? label : undefined}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all relative group",
                        collapsed ? "justify-center" : "",
                        active ? "text-white bg-white/8" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-violet-400" : "group-hover:text-zinc-300")} />
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate overflow-hidden whitespace-nowrap"
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {active && <motion.div layoutId="sidebar-active-indicator" className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-violet-500" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Workspace indicator */}
      {workspace && (
        <div className="border-t border-white/5 px-2.5 py-2">
          <Link
            href={base ?? "/projects"}
            className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5", collapsed ? "justify-center" : "")}
            title={collapsed ? `${workspace.projectSlug} / ${workspace.envSlug}` : undefined}
          >
            <span className={cn("shrink-0 rounded-full shadow-[0_0_6px]", collapsed ? "h-2.5 w-2.5" : "h-2 w-2", envDotClass(workspace.envSlug))} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="min-w-0 overflow-hidden">
                  <p className="text-[11px] font-medium text-zinc-300 truncate leading-none">
                    {workspace.projectSlug}
                    <span className="text-zinc-600"> / </span>
                    {workspace.envSlug}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Current workspace</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-white/5">
        {token && (
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="User menu"
                className={cn(
                  "w-full flex items-center cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500",
                  collapsed ? "justify-center py-4" : "gap-3 px-3 py-3",
                )}
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-300">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-zinc-200 truncate leading-none">{displayName}</p>
                      <p className="text-[11px] text-zinc-600 truncate mt-0.5">{roleLabel}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!collapsed && <MoreHorizontal className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden="true" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56 bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-xl ml-1 mb-1">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3 py-1">
                  <div className="h-8 w-8 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{displayName}</p>
                    {org?.slug && <p className="text-[11px] text-zinc-500 truncate max-w-[160px]">org: {org.slug}</p>}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isAdmin ? <ShieldCheck className="h-3 w-3 text-amber-400" /> : <UserCog className="h-3 w-3 text-zinc-400" />}
                      <span className={cn("text-[11px] font-medium", isAdmin ? "text-amber-400" : "text-zinc-400")}>{roleLabel}</span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                onClick={() => {
                  setUserMenuOpen(false);
                  resetPwdDialog();
                  setShowChangePwd(true);
                }}
                className="text-zinc-400 hover:text-white focus:bg-white/5 cursor-pointer text-sm py-2"
              >
                <Lock className="h-4 w-4 mr-2.5" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                onClick={async () => {
                  setUserMenuOpen(false);
                  await logout();
                  router.push("/login");
                }}
                className="text-red-400 hover:text-red-300 focus:bg-red-500/10 cursor-pointer text-sm py-2"
              >
                <LogOut className="h-4 w-4 mr-2.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePwd} onOpenChange={(o) => !o && setShowChangePwd(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one. Other sessions will be signed out.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
            <Field label="Current password" value={currentPwd} onChange={setCurrentPwd} placeholder="Enter current password" autoFocus />
            <Field label="New password" value={newPwd} onChange={setNewPwd} placeholder="At least 8 characters" />
            <Field label="Confirm new password" value={confirmPwd} onChange={setConfirmPwd} placeholder="Repeat new password" />
            {pwdError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{pwdError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowChangePwd(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button type="submit" disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd} className="bg-violet-600 hover:bg-violet-500 text-white">
                {pwdLoading ? "Saving…" : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.aside>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600"
        autoFocus={autoFocus}
        required
      />
    </div>
  );
}
