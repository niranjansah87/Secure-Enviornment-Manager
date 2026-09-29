"use client";

import NextImage from "next/image";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/workspace-context";
import { api } from "@/lib/api";
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

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sem_sidebar_collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const buildNav = (
  workspace: { namespace: string; environment: string } | null,
  isAdmin: boolean
): NavSection[] => {
  const base =
    workspace != null
      ? `/${workspace.namespace}/${workspace.environment}`
      : null;

  const mainSection: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: base ?? "/projects", label: "Secrets", icon: KeyRound },
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

  const observeSection: NavItem[] = [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const accessSection: NavItem[] = [];
  if (isAdmin) {
    accessSection.push({ href: "/apikeys", label: "API Keys", icon: KeyRound, adminOnly: true });
    accessSection.push({ href: "/admin/users", label: "Users", icon: Users, adminOnly: true });
  }

  const sections: NavSection[] = [
    { items: mainSection },
    { label: "OBSERVE", items: observeSection },
  ];

  if (accessSection.length > 0) {
    sections.push({ label: "ACCESS", items: accessSection });
  }

  return sections;
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
  if (label === "API Keys") return pathname === "/apikeys";
  if (label === "Users") return pathname.startsWith("/admin/users");
  if (label === "Analytics") return pathname === "/analytics";
  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, token, username, email, logout } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabel = isAdmin ? "Administrator" : "Developer";

  // Change password dialog
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

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
      const res = await fetch(
        `${window.location.protocol}//${window.location.hostname}:8070/api/v1/user/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPwd || undefined,
            new_password: newPwd,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg =
          (data.error && typeof data.error === "object"
            ? data.error.message
            : null) ??
          (typeof data.error === "string" ? data.error : null) ??
          `Request failed (${res.status})`;
        setPwdError(msg);
        return;
      }
      setShowChangePwd(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch {
      setPwdError("Failed to connect to server.");
    } finally {
      setPwdLoading(false);
    }
  };

  const resetPwdDialog = () => {
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdError(null);
  };

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    api
      .isAdmin(token)
      .then((res) => setIsAdmin(res.is_admin))
      .catch(() => setIsAdmin(false));
  }, [token]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const sections = buildNav(workspace, isAdmin);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="relative z-40 flex h-full shrink-0 flex-col border-r border-white/5 bg-[#060608] shadow-[2px_0_24px_rgba(0,0,0,0.5)]"
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center border-b border-white/5 h-[72px]",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            aria-label="Expand sidebar"
            className="group relative flex items-center justify-center"
          >
            <NextImage
              src="/logo.png"
              width={40}
              height={40}
              alt="SEM"
              className="h-10 w-10 shrink-0 rounded-xl object-cover opacity-80 group-hover:opacity-40 transition-opacity"
              unoptimized
            />
            <ChevronRight className="absolute h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <NextImage
                src="/logo.png"
                width={40}
                height={40}
                alt="SEM"
                className="h-10 w-10 shrink-0 rounded-xl object-cover"
                unoptimized
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate leading-none">SEM</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">Secure Environment Manager</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="h-7 w-7 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-md shrink-0"
            >
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
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
                {section.label}
              </div>
            )}
            {section.label && collapsed && (
              <div className="h-px bg-white/5 mx-1 my-2" />
            )}
            <nav className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = navActive(label, pathname, workspace);
                return (
                  <Link key={label} href={href} title={collapsed ? label : undefined}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all relative group",
                        collapsed ? "justify-center" : "",
                        isActive
                          ? "text-white bg-white/8"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-violet-400" : "group-hover:text-zinc-300"
                        )}
                      />
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

                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-violet-500"
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

      {/* Workspace indicator */}
      {workspace && (
        <div className="border-t border-white/5 px-2.5 py-2">
          <Link
            href={`/${workspace.namespace}/${workspace.environment}`}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/5 group",
              collapsed ? "justify-center" : ""
            )}
            title={collapsed ? `${workspace.namespace} / ${workspace.environment}` : undefined}
          >
            <span
              className={cn(
                "shrink-0 rounded-full shadow-[0_0_6px]",
                collapsed ? "h-2.5 w-2.5" : "h-2 w-2",
                workspace.environment.toLowerCase() === "production" ? "bg-green-400 shadow-green-400/50" :
                workspace.environment.toLowerCase() === "staging" ? "bg-orange-400 shadow-orange-400/50" :
                ["dev", "development"].includes(workspace.environment.toLowerCase()) ? "bg-blue-400 shadow-blue-400/50" :
                workspace.environment.toLowerCase() === "preview" ? "bg-purple-400 shadow-purple-400/50" :
                "bg-zinc-400"
              )}
            />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-[11px] font-medium text-zinc-300 truncate leading-none">
                    {workspace.namespace}
                    <span className="text-zinc-600"> / </span>
                    {workspace.environment}
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
                  collapsed ? "justify-center py-4" : "gap-3 px-3 py-3"
                )}
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-300">
                  {username ? username.slice(0, 2).toUpperCase() : "NS"}
                </div>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-zinc-200 truncate leading-none">
                        {username ?? "Admin"}
                      </p>
                      <p className="text-[11px] text-zinc-600 truncate mt-0.5">
                        {roleLabel}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!collapsed && (
                  <MoreHorizontal className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden="true" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-56 bg-zinc-900/95 border-white/10 shadow-2xl backdrop-blur-xl ml-1 mb-1"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3 py-1">
                  <div className="h-8 w-8 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0">
                    {username ? username.slice(0, 2).toUpperCase() : "NS"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {username ?? "Admin"}
                    </p>
                    {email && (
                      <p className="text-[11px] text-zinc-500 truncate max-w-[160px]">
                        {email}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isAdmin ? (
                        <ShieldCheck className="h-3 w-3 text-amber-400" />
                      ) : (
                        <UserCog className="h-3 w-3 text-zinc-400" />
                      )}
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          isAdmin ? "text-amber-400" : "text-zinc-400"
                        )}
                      >
                        {roleLabel}
                      </span>
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
                Change Password
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
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePwd}
        onOpenChange={(o) => {
          if (!o) setShowChangePwd(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and set a new one.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => void handleChangePassword(e)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Current Password</Label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">New Password</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 8 characters"
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                required
              />
            </div>
            {pwdError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {pwdError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowChangePwd(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pwdLoading || !newPwd || !confirmPwd}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {pwdLoading ? "Saving…" : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.aside>
  );
}
