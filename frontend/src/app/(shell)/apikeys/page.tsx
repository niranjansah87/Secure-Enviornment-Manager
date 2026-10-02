"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, API_KEY_SCOPES, type ApiKey, type ApiKeyCreated, type User } from "@/lib/sem-api";
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

export default function ApiKeysPage() {
  const { call, isAdmin } = useWorkspace();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await call((t) => sem.listApiKeys(t));
      setKeys(list);
      if (isAdmin) {
        void call((t) => sem.listUsers(t)).then(setUsers).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [call, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await call((t) => sem.revokeApiKey(t, revokeTarget.id));
      toast.success(`Revoked ${revokeTarget.name}`);
      setRevokeTarget(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Revoke failed");
    } finally {
      setRevoking(false);
    }
  }

  const userLabel = (id: string | null) => (id ? users.find((u) => u.id === id)?.username ?? `${id.slice(0, 8)}…` : null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <KeyRound className="h-3.5 w-3.5" /> API Keys
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">API keys</h1>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">Programmatic access tokens for the CLI, SDK and CI/CD. Revoked keys are permanently deleted.</p>
        </div>
        <Button className="shrink-0 bg-violet-600 hover:bg-violet-500" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New key
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />)}
        </div>
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void load()}>Retry</Button>
        </Card>
      ) : keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Create a key to access SEM from the CLI, SDK or your CI/CD pipeline." actionLabel="New key" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3">
          {keys.map((k, i) => (
            <motion.div key={k.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-zinc-100">{k.name}</p>
                    <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{k.key_prefix}…</code>
                    {userLabel(k.user_id) && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                        <Link2 className="h-3 w-3" /> {userLabel(k.user_id)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden text-right text-xs text-zinc-500 sm:block">
                  <p className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> {k.last_used_at ? `Used ${formatIso(k.last_used_at)}` : "Never used"}</p>
                  <p>{k.expires_at ? `Expires ${formatIso(k.expires_at)}` : "No expiry"}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => setRevokeTarget(k)}>
                  <Trash2 className="h-4 w-4" /> Revoke
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreateKeyDialog open={showCreate} onOpenChange={setShowCreate} users={users} isAdmin={isAdmin} onCreated={(res) => { setShowCreate(false); setCreated(res); void load(); }} />

      {/* One-time reveal */}
      <RevealKeyDialog created={created} onClose={() => setCreated(null)} />

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <code className="rounded bg-violet-400/10 px-1 text-violet-400">{revokeTarget?.name}</code> will stop working immediately and is permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking} className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500" disabled={revoking} onClick={(e) => { e.preventDefault(); void confirmRevoke(); }}>
              {revoking ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  users,
  isAdmin,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  users: User[];
  isAdmin: boolean;
  onCreated: (res: ApiKeyCreated) => void;
}) {
  const { call } = useWorkspace();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["secrets:read"]);
  const [userId, setUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setScopes(["secrets:read"]);
      setUserId("");
      setExpiresAt("");
      setError(null);
    }
  }, [open]);

  const toggleScope = (s: string) => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (scopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }
    setSaving(true);
    try {
      const res = await call((t) =>
        sem.createApiKey(t, {
          name: name.trim(),
          scopes,
          user_id: userId || undefined,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      );
      onCreated(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">New API key</DialogTitle>
          <DialogDescription>The raw key is shown once after creation. Store it securely.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI/CD deploy key" className="bg-black/40 border-white/10" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Scopes</Label>
            <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-white/8 bg-black/30 p-2">
              {API_KEY_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-zinc-300 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-600" />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {isAdmin && users.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Bind to user (optional)</Label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 w-full rounded-lg border border-white/8 bg-black/40 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="" className="bg-zinc-900">No binding (org-level)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-zinc-900">{u.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Expires (optional)</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bg-black/40 border-white/10" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500">
              {saving ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevealKeyDialog({ created, onClose }: { created: ApiKeyCreated | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!created) return;
    void navigator.clipboard.writeText(created.key);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-amber-400" /> Copy your API key
          </DialogTitle>
          <DialogDescription>This is the only time the full key is shown. Store it somewhere safe.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-emerald-400">{created?.key}</code>
          <Button variant="outline" size="icon" className={cn("h-8 w-8 shrink-0 border-white/10", copied && "text-emerald-400")} onClick={copy} aria-label="Copy key">
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
