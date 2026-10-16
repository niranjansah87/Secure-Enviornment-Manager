"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  UserCog,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type User, type UserCreated, type UserRole } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatIso, cn } from "@/lib/utils";

const ROLES: UserRole[] = ["admin", "developer", "viewer"];
const USER_SCOPES = [
  "secrets:read",
  "secrets:write",
  "secrets:delete",
  "secrets:export",
  "admin:projects",
  "admin:environments",
  "admin:users",
];

export default function UsersPage() {
  const { call, me } = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("developer");
  const [scopes, setScopes] = useState<string[]>(["secrets:read"]);
  const [submitting, setSubmitting] = useState(false);

  const [created, setCreated] = useState<UserCreated | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await call((t) => sem.listUsers(t));
      setUsers(list);
    } catch {
      // Demo fallback
      setUsers([
        { id: "usr-1", username: "niranjan", email: "niranjan@sem.local", role: "admin", scopes: USER_SCOPES, created_at: new Date(Date.now() - 60 * 86400000).toISOString(), is_active: true, must_change_password: false },
        { id: "usr-2", username: "alex.dev", email: "alex@sem.local", role: "developer", scopes: ["secrets:read", "secrets:write"], created_at: new Date(Date.now() - 20 * 86400000).toISOString(), is_active: true, must_change_password: false },
        { id: "usr-3", username: "sarah.qa", email: "sarah@sem.local", role: "viewer", scopes: ["secrets:read"], created_at: new Date(Date.now() - 5 * 86400000).toISOString(), is_active: true, must_change_password: false },
      ]);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setUsername("");
    setRole("developer");
    setScopes(["secrets:read", "secrets:write"]);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setUsername(u.username);
    setRole(u.role);
    setScopes([...u.scopes]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await call((t) => sem.updateUser(t, editing.id, { role, scopes }));
        toast.success(`Updated "${editing.username}"`);
      } else {
        const res = await call((t) => sem.createUser(t, { username: username.trim(), role, scopes }));
        setCreated(res);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await call((t) => sem.deleteUser(t, deleteTarget.id));
      toast.success(`Deleted user "${deleteTarget.username}"`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const copyPassword = async (pwd: string) => {
    await navigator.clipboard.writeText(pwd);
    setCopiedPwd(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopiedPwd(false), 2000);
  };

  const admins = users.filter((u) => u.role === "admin").length;
  const developers = users.filter((u) => u.role === "developer").length;
  const viewers = users.filter((u) => u.role === "viewer").length;

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <span>Access</span>
              <span>/</span>
              <span className="text-blue-400">Users</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Users &amp; RBAC</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Manage organization members, assign roles (Admin, Developer, Viewer), and calibrate granular scopes.
            </p>
          </div>

          <Button
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Invite user</span>
          </Button>
        </div>
      </ScenicBanner>

      {/* 2. Stat Summary Cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-white tabular-nums">{users.length}</p>
            <p className="text-[11px] text-zinc-400">Total members</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-400 tabular-nums">{admins}</p>
            <p className="text-[11px] text-zinc-400">Administrators</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-400 tabular-nums">{developers}</p>
            <p className="text-[11px] text-zinc-400">Developers</p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center gap-3 transition-all cursor-default"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-purple-400 tabular-nums">{viewers}</p>
            <p className="text-[11px] text-zinc-400">Viewers</p>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Users Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#07090e]/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions / Scopes</th>
                <th className="py-3 px-4">Added on</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Loading users…
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((u) => {
                  const isSelf = me?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 text-xs font-bold text-white flex items-center justify-center shadow">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white">{u.username}</span>
                            {isSelf && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-mono font-medium capitalize",
                            u.role === "admin"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : u.role === "developer"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          )}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {u.scopes.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/[0.05] text-zinc-400"
                            >
                              {s}
                            </span>
                          ))}
                          {u.scopes.length > 3 && (
                            <span className="text-[9px] text-zinc-500 font-mono">
                              +{u.scopes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">{formatIso(u.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="text-zinc-300 hover:text-white hover:bg-white/[0.06] text-xs h-8"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(u)}
                              className="text-red-400 hover:bg-red-500/10 text-xs h-8"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? `Edit ${editing.username}` : "Invite Team Member"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {editing
                ? "Update user role and access permissions."
                : "Create a user account. A secure temporary password will be generated."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex.dev"
                  className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                  autoFocus
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold capitalize border transition-all",
                      role === r
                        ? "bg-blue-600/25 border-blue-500/50 text-white"
                        : "bg-[#07090e] border-white/[0.08] text-zinc-400 hover:text-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Granted Scopes</Label>
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 pt-1">
                {USER_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) setScopes((s) => [...s, scope]);
                        else setScopes((s) => s.filter((x) => x !== scope));
                      }}
                      className="rounded border-white/20 bg-black/40 text-blue-600"
                    />
                    <span className="font-mono text-[11px]">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
                {submitting ? "Saving..." : editing ? "Save changes" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Reveal Modal (Matching left_pages.txt) */}
      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-base">User Created Successfully</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Provide this temporary password to <span className="font-bold text-white">{created?.username}</span>.
              They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#07090e] font-mono text-xs text-zinc-200 break-all select-all flex items-center justify-between gap-3 my-2">
            <span>{created?.temp_password}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyPassword(created?.temp_password ?? "")}
              className="h-8 px-2.5 rounded-lg border-white/[0.1] shrink-0 text-xs"
            >
              {copiedPwd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button onClick={() => setCreated(null)} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete user account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              Are you sure you want to remove &ldquo;{deleteTarget?.username}&rdquo;? They will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/[0.1] text-zinc-300 text-xs hover:bg-white/[0.05]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
            >
              {deleting ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
