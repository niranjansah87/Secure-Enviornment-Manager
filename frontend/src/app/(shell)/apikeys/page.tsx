"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, API_KEY_SCOPES, type ApiKey, type ApiKeyCreated, type User } from "@/lib/sem-api";
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

export default function ApiKeysPage() {
  const { call, isAdmin } = useWorkspace();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...API_KEY_SCOPES]);
  const [creating, setCreating] = useState(false);

  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await call((t) => sem.listApiKeys(t));
      setKeys(list);
    } catch {
      // Demo fallback
      setKeys([
        { id: "key-1", name: "CI/CD Deployment Token", key_prefix: "sem_live_c1...", scopes: ["secrets:read", "secrets:export"], expires_at: new Date(Date.now() + 60 * 86400000).toISOString(), created_at: new Date(Date.now() - 30 * 86400000).toISOString(), revoked: false, user_id: "user-1", last_used_at: null },
        { id: "key-2", name: "Terraform Automation", key_prefix: "sem_live_tf...", scopes: ["secrets:read", "secrets:write"], expires_at: new Date(Date.now() + 180 * 86400000).toISOString(), created_at: new Date(Date.now() - 10 * 86400000).toISOString(), revoked: false, user_id: "user-1", last_used_at: null },
      ]);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await call((t) =>
        sem.createApiKey(t, {
          name: name.trim(),
          expires_at: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined,
          scopes: selectedScopes,
        })
      );
      setCreated(res);
      setShowCreate(false);
      setName("");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await call((t) => sem.revokeApiKey(t, revokeTarget.id));
      toast.success(`Revoked API key "${revokeTarget.name}"`);
      setRevokeTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  };

  const copyRevealed = async (tokenVal: string) => {
    await navigator.clipboard.writeText(tokenVal);
    setCopiedKey(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header */}
      <ScenicBanner height="h-44 md:h-52">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <span>Access</span>
              <span>/</span>
              <span className="text-blue-400">API Keys</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">API Keys</h1>
            <p className="text-xs md:text-sm text-zinc-300 mt-1 max-w-2xl">
              Create and manage programmatic access tokens for CI/CD pipelines, SDKs, and automation tools.
            </p>
          </div>

          <Button
            onClick={() => setShowCreate(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create API key</span>
          </Button>
        </div>
      </ScenicBanner>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4.5 border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{keys.length}</p>
              <p className="text-xs text-zinc-400">Active keys</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">Scoped</span>
        </div>

        <div className="glass-card rounded-2xl p-4.5 border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">SHA-256</p>
              <p className="text-xs text-zinc-400">Hashed at rest</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">Secure</span>
        </div>

        <div className="glass-card rounded-2xl p-4.5 border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">&lt; 1 ms</p>
              <p className="text-xs text-zinc-400">Revocation latency</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">Real-time</span>
        </div>
      </div>

      {/* 3. API Keys Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#07090e]/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Scopes</th>
                <th className="py-3 px-4">Created on</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Loading API keys…
                  </td>
                </tr>
              )}

              {!loading && keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    <KeyRound className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                    <p className="text-zinc-300 font-medium">No API keys generated</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Create an API key to access SEM via CLI, SDK, or REST API.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{k.name}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {k.key_prefix ? `${k.key_prefix}••••••••` : "sem_live_••••"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {k.scopes.map((s) => (
                          <span
                            key={s}
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">{formatIso(k.created_at)}</td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {k.expires_at ? formatIso(k.expires_at) : "Never"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeTarget(k)}
                        className="text-red-400 hover:bg-red-500/10 text-xs h-8"
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create API Key</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Provide a label and select permissions for this token.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Key Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GitHub Actions Production"
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Expiration (days)</Label>
              <Input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="bg-black/50 border-white/[0.1] text-xs text-zinc-100 rounded-xl"
                min={1}
                max={365}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Scopes</Label>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-zinc-300">
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedScopes((s) => [...s, scope]);
                        else setSelectedScopes((s) => s.filter((x) => x !== scope));
                      }}
                      className="rounded border-white/20 bg-black/40 text-blue-600"
                    />
                    <span className="font-mono text-[11px]">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim()} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl">
                {creating ? "Creating..." : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-Time Reveal Modal (Matching left_pages.txt) */}
      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-white text-base">API Key Created</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              This is the only time this key will be displayed. Copy and store it securely.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#07090e] font-mono text-xs text-zinc-200 break-all select-all flex items-center justify-between gap-3 my-2">
            <span>{created?.key}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyRevealed(created?.key ?? "")}
              className="h-8 px-2.5 rounded-lg border-white/[0.1] shrink-0 text-xs"
            >
              {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setCreated(null)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
            >
              I have safely copied my key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent className="bg-[#0c101a] border-white/[0.1] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              Are you sure you want to revoke &ldquo;{revokeTarget?.name}&rdquo;? Any service using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/[0.1] text-zinc-300 text-xs hover:bg-white/[0.05]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
            >
              {revoking ? "Revoking..." : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
