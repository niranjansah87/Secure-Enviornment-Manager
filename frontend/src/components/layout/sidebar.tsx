"use client";

import Link from "next/link";
import Image from "next/image";
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
  MoreVertical,
  Settings,
  ChevronsUpDown,
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
  badge?: string;
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
  ];

  const observe: NavItem[] = [
    { key: "analytics", href: "/analytics", label: "Analytics", icon: BarChart3, badge: "New" },
  ];

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

  // Common workspace settings
  sections[0].items.push({ key: "settings", href: ws("/settings"), label: "Settings", icon: Settings });

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
      toast.success("Password changed successfully.");
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
      animate={{ width: collapsed ? 76 : 240 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="relative z-40 flex h-full shrink-0 flex-col border-r border-white/[0.08] bg-[#07090e] shadow-[4px_0_30px_rgba(0,0,0,0.6)] select-none"
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center border-b border-white/[0.08] h-16 transition-all",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            aria-label="Expand sidebar"
            className="group relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:border-blue-400/60 transition-all"
          >
            <div className="relative h-6 w-6">
              <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
            </div>
            <ChevronRight className="absolute h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded" />
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0 group">
              <div className="relative h-8 w-8 shrink-0 rounded-lg p-0.5 bg-gradient-to-br from-blue-500/30 to-purple-500/20 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                    Secure.
                  </span>
                </div>
                <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 leading-none">
                  Environment Manager
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-md shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <div data-lenis-prevent className="flex-1 overflow-y-auto py-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-5" : ""}>
            {section.label && !collapsed && (
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                {section.label}
              </div>
            )}
            {section.label && collapsed && <div className="h-px bg-white/[0.06] mx-2 my-2" />}
            <nav className="flex flex-col gap-1">
              {section.items.map(({ key, href, label, icon: Icon, badge }) => {
                const active = isNavActive(key, pathname, base);
                return (
                  <Link key={key} href={href} title={collapsed ? label : undefined}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all relative group",
                        collapsed ? "justify-center px-0" : "",
                        active
                          ? "text-white bg-gradient-to-r from-blue-600/25 via-blue-500/15 to-transparent border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.18)]"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-200"
                        )}
                      />
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate overflow-hidden whitespace-nowrap flex-1"
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {badge && !collapsed && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {badge}
                        </span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-glow"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Atmospheric Mountain Background Graphic in Sidebar Footer */}
      <div className="relative border-t border-white/[0.08] overflow-hidden pt-2">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <Image
            src="/sidebar_image.png"
            alt="Mountains"
            fill
            className="object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
        </div>

        {/* Current Workspace Pill Card */}
        {workspace && (
          <div className="relative z-10 px-2.5 pb-2">
            <Link
              href={base ?? "/projects"}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#0c101a]/80 p-2 hover:bg-[#121724] hover:border-blue-500/30 transition-all",
                collapsed ? "justify-center p-2" : ""
              )}
              title={collapsed ? `${workspace.projectSlug} / ${workspace.envSlug}` : undefined}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30 shrink-0">
                <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-0 flex-1 overflow-hidden"
                  >
                    <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                      {workspace.projectSlug}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_6px]", envDotClass(workspace.envSlug))} />
                      <span className="text-[10px] text-zinc-400 capitalize">{workspace.envSlug}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!collapsed && <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
            </Link>
          </div>
        )}

        {/* User Profile Pill */}
        <div className="relative z-10 p-2.5 pt-0">
          {token && (
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="User menu"
                  className={cn(
                    "w-full flex items-center cursor-pointer rounded-xl border border-white/[0.06] bg-[#0c101a]/60 hover:bg-[#121724] hover:border-white/[0.12] transition-all p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
                    collapsed ? "justify-center p-2" : "gap-2.5"
                  )}
                >
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                          {displayName}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{roleLabel}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!collapsed && <MoreVertical className="h-4 w-4 text-zinc-500 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-56 bg-[#0c101a]/95 border-white/[0.1] shadow-2xl backdrop-blur-xl ml-1 mb-1 rounded-xl"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-8 w-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{displayName}</p>
                      {org?.slug && (
                        <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                          org: {org.slug}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        {isAdmin ? (
                          <ShieldCheck className="h-3 w-3 text-amber-400" />
                        ) : (
                          <UserCog className="h-3 w-3 text-zinc-400" />
                        )}
                        <span className={cn("text-[10px] font-medium", isAdmin ? "text-amber-400" : "text-zinc-400")}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem
                  onClick={() => {
                    setUserMenuOpen(false);
                    resetPwdDialog();
                    setShowChangePwd(true);
                  }}
                  className="text-zinc-300 hover:text-white focus:bg-white/[0.06] cursor-pointer text-xs py-2 rounded-lg"
                >
                  <Lock className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await logout();
                    router.push("/login");
                  }}
                  className="text-red-400 hover:text-red-300 focus:bg-red-500/10 cursor-pointer text-xs py-2 rounded-lg"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePwd} onOpenChange={(o) => !o && setShowChangePwd(false)}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change password</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Enter your current password and choose a new one. Other sessions will be signed out.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4 pt-2">
            <Field label="Current password" value={currentPwd} onChange={setCurrentPwd} placeholder="Enter current password" autoFocus />
            <Field label="New password" value={newPwd} onChange={setNewPwd} placeholder="At least 8 characters" />
            <Field label="Confirm new password" value={confirmPwd} onChange={setConfirmPwd} placeholder="Repeat new password" />
            {pwdError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {pwdError}
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowChangePwd(false)} className="text-zinc-400 hover:text-white">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
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
      <Label className="text-xs text-zinc-300">{label}</Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-black/50 border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 rounded-xl"
        autoFocus={autoFocus}
        required
      />
    </div>
  );
}
