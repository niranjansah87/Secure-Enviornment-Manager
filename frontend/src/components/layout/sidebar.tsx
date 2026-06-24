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
  ChevronRight,
  ChevronUp,
  GitCompare,
  LogOut,
  History,
  BarChart3,
  Users,
  Lock,
  ShieldCheck,
  UserCog,
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

const buildNav = (
  workspace: { namespace: string; environment: string } | null,
  isAdmin: boolean
): NavItem[] => {
  const base =
    workspace != null
      ? `/${workspace.namespace}/${workspace.environment}`
      : null;
  const items: NavItem[] = [
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

  // Only add admin-only items for admin users
  if (isAdmin) {
    items.push({
      href: "/apikeys",
      label: "API Keys",
      icon: KeyRound,
      adminOnly: true,
    });
    items.push({
      href: "/admin/users",
      label: "Users",
      icon: Users,
      adminOnly: true,
    });
  }

  return items;
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
  const [, setLoadingAdmin] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Determine role label
  const roleLabel = isAdmin ? "Admin" : "Developer";

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
      const res = await fetch(`${window.location.protocol}//${window.location.hostname}:8070/api/v1/user/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPwd || undefined,
          new_password: newPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg =
          (data.error && typeof data.error === "object" ? data.error.message : null) ??
          (typeof data.error === "string" ? data.error : null) ??
          `Request failed (${res.status})`;
        setPwdError(msg);
        return;
      }
      // Success — close dialog and reset
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
    } catch {
      /* ignore */
    }
  }, []);

  // Check admin status when token changes
  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      setLoadingAdmin(false);
      return;
    }

    api.isAdmin(token)
      .then((res) => {
        setIsAdmin(res.is_admin);
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => {
        setLoadingAdmin(false);
      });
  }, [token]);

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

  const items = buildNav(workspace, isAdmin);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: "spring", damping: 24, stiffness: 200 }}
      className="relative z-40 flex h-full shrink-0 flex-col border-r border-white/5 bg-[#030303] shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
    >
      <div className={cn(
        "flex items-center border-b border-white/5",
        collapsed ? "h-24 justify-center" : "h-24 justify-between px-4"
      )}>
        {collapsed ? (
          /* Collapsed: logo with expand on hover */
          <button
            onClick={toggle}
            className="group relative flex items-center justify-center"
            title="Expand sidebar"
          >
            <NextImage
              src="/logo.png"
              width={48}
              height={48}
              alt="SEM"
              className="h-12 w-12 shrink-0 rounded-xl object-cover opacity-80 group-hover:opacity-40 transition-opacity"
              unoptimized
            />
            <ChevronRight className="absolute h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          /* Expanded: logo + collapse button */
          <>
            <Link href="/">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
              >
                <NextImage
                  src="/logo.png"
                  width={56}
                  height={56}
                  alt="Secure Environment Manager"
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  unoptimized
                />
              </motion.div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="h-7 w-7 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-md shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

      {/* Bottom section: user menu + collapse icon */}
      <div className="mt-auto border-t border-white/5 bg-[#050505]/50 backdrop-blur-sm">
        {/* User Dropdown Menu */}
        {token && (
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <div className="flex justify-center py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300">
                    {username ? username.slice(0, 2).toUpperCase() : "AD"}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                    {username ? username.slice(0, 2).toUpperCase() : "AD"}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {username ?? "Admin"}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {roleLabel}
                    </p>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-56 bg-zinc-900 border-white/10 shadow-2xl ml-2 mb-1"
            >
              {/* User info header */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3 py-1">
                  <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                    {username ? username.slice(0, 2).toUpperCase() : "AD"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {username ?? "Admin"}
                    </p>
                    {email && (
                      <p className="text-[11px] text-zinc-500 truncate max-w-[160px]">{email}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isAdmin ? (
                        <ShieldCheck className="h-3 w-3 text-amber-400" />
                      ) : (
                        <UserCog className="h-3 w-3 text-zinc-400" />
                      )}
                      <span className={`text-[11px] font-medium ${isAdmin ? "text-amber-400" : "text-zinc-400"}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {/* Change Password */}
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
              {/* Log Out */}
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
      <Dialog open={showChangePwd} onOpenChange={(o) => { if (!o) setShowChangePwd(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and set a new one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Current Password</Label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
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
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
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
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
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

