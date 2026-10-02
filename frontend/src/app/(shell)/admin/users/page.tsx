"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type User, type UserCreated, type UserRole } from "@/lib/sem-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";
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
const USER_SCOPES = ["secrets:read", "secrets:write", "secrets:delete", "secrets:export", "admin:projects", "admin:environments", "admin:users"];

export default function UsersPage() {
  const { call, me } = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [created, setCreated] = useState<UserCreated | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await call((t) => sem.listUsers(t)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await call((t) => sem.deleteUser(t, deleteTarget.id));
      toast.success(`Deleted ${deleteTarget.username}`);
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <UsersIcon className="h-3.5 w-3.5" /> Users
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Users</h1>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Manage team members, roles and scoped permissions. New users get a one-time temporary password.</p>
        </div>
        <Button className="shrink-0 bg-violet-600 hover:bg-violet-500" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New user
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}
        </div>
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void load()}>Retry</Button>
        </Card>
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users" description="Add your first team member to grant scoped access." actionLabel="New user" onAction={() => { setEditing(null); setShowForm(true); }} />
      ) : (
        <div className="space-y-3">
          {users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold", u.role === "admin" ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-violet-500/30 bg-violet-600/20 text-violet-300")}>
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-zinc-100">{u.username}</p>
                    {me?.id === u.id && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">You</span>}
                    {!u.is_active && <span className="rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Disabled</span>}
                    {u.must_change_password && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">Must change password</span>}
                  </div>
                  <p className="truncate text-xs text-zinc-500">{u.email ?? "no email"}</p>
                </div>
                <div className="hidden min-w-0 flex-1 sm:block">
                  <div className="flex flex-wrap gap-1">
                    {u.scopes.slice(0, 4).map((s) => (
                      <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{s}</span>
                    ))}
                    {u.scopes.length > 4 && <span className="text-[10px] text-zinc-600">+{u.scopes.length - 4}</span>}
                  </div>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", u.role === "admin" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400")}>
                  {u.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
                  {u.role}
                </span>
                <p className="hidden shrink-0 text-right text-xs text-zinc-500 lg:block">{formatIso(u.created_at)}</p>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => { setEditing(u); setShowForm(true); }} aria-label="Edit user">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400 disabled:opacity-30" disabled={me?.id === u.id} onClick={() => setDeleteTarget(u)} aria-label="Delete user">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <UserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        onDone={(res) => {
          setShowForm(false);
          if (res) setCreated(res);
          void load();
        }}
      />

      <RevealPasswordDialog created={created} onClose={() => setCreated(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <code className="rounded bg-violet-400/10 px-1 text-violet-400">{deleteTarget?.username}</code> will lose all access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500" disabled={deleting} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>
              {deleting ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: User | null;
  onDone: (created: UserCreated | null) => void;
}) {
  const { call } = useWorkspace();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("developer");
  const [scopes, setScopes] = useState<string[]>(["secrets:read", "secrets:write"]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setUsername(editing.username);
      setEmail(editing.email ?? "");
      setRole(editing.role);
      setScopes(editing.scopes);
      setIsActive(editing.is_active);
    } else {
      setUsername("");
      setEmail("");
      setRole("developer");
      setScopes(["secrets:read", "secrets:write"]);
      setIsActive(true);
    }
  }, [open, editing]);

  const toggleScope = (s: string) => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && username.trim().length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await call((t) => sem.updateUser(t, editing.id, { email: email.trim() || undefined, role, scopes, is_active: isActive }));
        toast.success(`Updated ${editing.username}`);
        onDone(null);
      } else {
        const res = await call((t) => sem.createUser(t, { username: username.trim(), email: email.trim() || undefined, role, scopes }));
        onDone(res);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{editing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>{editing ? "Update role, scopes and status." : "A temporary password is generated and shown once."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane.doe" disabled={!!editing} className={cn("bg-black/40 border-white/10", editing && "opacity-60")} autoFocus={!editing} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Email (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="bg-black/40 border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="h-10 w-full rounded-lg border border-white/8 bg-black/40 px-3 text-sm capitalize text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
              {ROLES.map((r) => <option key={r} value={r} className="bg-zinc-900">{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Scopes</Label>
            <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-white/8 bg-black/30 p-2 max-h-40 overflow-y-auto">
              {USER_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-zinc-300 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-600" />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-600" />
              Account active
            </label>
          )}
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500">
              {saving ? "Saving…" : editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevealPasswordDialog({ created, onClose }: { created: UserCreated | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!created) return;
    void navigator.clipboard.writeText(created.temp_password);
    setCopied(true);
    toast.success("Password copied");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-amber-400" /> Temporary password
          </DialogTitle>
          <DialogDescription>Share this with {created?.username}. It is shown only once and must be changed on first login.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-sm text-emerald-400">{created?.temp_password}</code>
          <Button variant="outline" size="icon" className={cn("h-8 w-8 shrink-0 border-white/10", copied && "text-emerald-400")} onClick={copy} aria-label="Copy password">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button className="bg-violet-600 hover:bg-violet-500" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
