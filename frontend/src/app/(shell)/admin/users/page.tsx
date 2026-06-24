"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Shield,
  UserCog,
  X,
  Copy,
  Check,
  Users,
  Loader2,
  AlertTriangle,
  Mail,
  Globe,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useWorkspace } from "@/context/workspace-context";
import { api, type User } from "@/lib/api";

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; users: User[] };

type DialogMode =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "reset"; user: User }
  | { kind: "delete"; user: User };

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function roleBadge(role: string) {
  return role === "admin" ? (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[11px] px-2 py-0.5 rounded-md">
      <Shield className="h-3 w-3 mr-1" />
      Admin
    </Badge>
  ) : (
    <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/25 text-[11px] px-2 py-0.5 rounded-md">
      <UserCog className="h-3 w-3 mr-1" />
      Developer
    </Badge>
  );
}

function statusBadge(status: string) {
  return status === "active" ? (
    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[11px] px-2 py-0.5 rounded-md">
      Active
    </Badge>
  ) : (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[11px] px-2 py-0.5 rounded-md">
      Disabled
    </Badge>
  );
}

function scopeLabel(scope: string) {
  if (scope === "*") return "All Access";
  return scope;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ------------------------------------------------------------------ //
//  Create User Dialog                                                 //
// ------------------------------------------------------------------ //

function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { username: string; temp_password: string; email_sent: boolean }) => void;
}) {
  const { token } = useWorkspace();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "developer">("developer");
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<string>>(new Set());
  const [availableEnvPairs, setAvailableEnvPairs] = useState<{ ns: string; env: string }[]>([]);
  const [loadingEnvPairs, setLoadingEnvPairs] = useState(false);
  const [expandedNs, setExpandedNs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUsername("");
    setEmail("");
    setRole("developer");
    setSelectedEnvironments(new Set());
    setExpandedNs(new Set());
    setError(null);
  };

  // Fetch available environments when dialog opens
  const loadEnvPairs = async () => {
    if (!token) return;
    setLoadingEnvPairs(true);
    setAvailableEnvPairs([]);
    try {
      const envs = await api.metaEnvironments(token);
      const pairs: { ns: string; env: string }[] = [];
      for (const [ns, envList] of Object.entries(envs.environments || {})) {
        for (const env of envList as string[]) {
          pairs.push({ ns, env });
        }
      }
      setAvailableEnvPairs(pairs);
    } catch {
      setAvailableEnvPairs([]);
    } finally {
      setLoadingEnvPairs(false);
    }
  };

  const toggleEnv = (ns: string, env: string) => {
    const key = `${ns}/${env}`;
    setSelectedEnvironments(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleNs = (ns: string, envs: string[]) => {
    setSelectedEnvironments(prev => {
      const next = new Set(prev);
      const allSelected = envs.every(e => next.has(`${ns}/${e}`));
      if (allSelected) {
        envs.forEach(e => next.delete(`${ns}/${e}`));
      } else {
        envs.forEach(e => next.add(`${ns}/${e}`));
      }
      return next;
    });
  };

  // Load env pairs when dialog opens (CreateUserDialog)
  useEffect(() => {
    if (open) {
      reset();
      void loadEnvPairs();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    const scopes = selectedEnvironments.size > 0
      ? Array.from(selectedEnvironments)
      : [];

    setLoading(true);
    try {
      const result = await api.createUser(token!, {
        username: username.trim(),
        role,
        email: email.trim() || undefined,
        scopes: scopes.length > 0 ? scopes : [],
      });
      reset();
      onCreated({
        username: result.username,
        temp_password: result.temp_password,
        email_sent: result.email_sent,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create User</DialogTitle>
          <DialogDescription>
            Create a new developer or admin account. A temporary password will be generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Username *</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Role</Label>
            <div className="flex gap-2">
              {(["developer", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    role === r
                      ? r === "admin"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-violet-500/40 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/15"
                  }`}
                >
                  {r === "admin" ? "Admin" : "Developer"}
                </button>
              ))}
            </div>
          </div>

          {/* Allowed Namespaces & Environments */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Allowed Namespaces & Environments</Label>
            {loadingEnvPairs ? (
              <Skeleton className="h-16 bg-white/10 rounded-lg" />
            ) : availableEnvPairs.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No environments available.</p>
            ) : (
              <>
                {selectedEnvironments.size === 0 && (
                  <p className="text-[11px] text-violet-400/80 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Nothing selected = full access
                  </p>
                )}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {(() => {
                    const grouped = new Map<string, string[]>();
                    availableEnvPairs.forEach(p => {
                      if (!grouped.has(p.ns)) grouped.set(p.ns, []);
                      grouped.get(p.ns)!.push(p.env);
                    });
                    return Array.from(grouped.entries()).map(([ns, envs]) => {
                      const isOpen = expandedNs.has(ns);
                      const selectedInNs = envs.filter(e => selectedEnvironments.has(`${ns}/${e}`)).length;
                      const allSelected = selectedInNs === envs.length;
                      return (
                        <div key={ns} className="border-b border-white/5 last:border-b-0">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedNs(prev => {
                                const next = new Set(prev);
                                if (next.has(ns)) next.delete(ns); else next.add(ns);
                                return next;
                              });
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors text-left"
                          >
                            <span className="flex items-center gap-2">
                              <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                              <span className="text-xs font-medium text-zinc-300">{ns}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              {selectedInNs > 0 && (
                                <span className={`text-[10px] font-medium ${allSelected ? "text-violet-400" : "text-zinc-500"}`}>
                                  {selectedInNs}/{envs.length}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleNs(ns, envs); }}
                                className="text-[10px] text-zinc-600 hover:text-violet-400 transition-colors"
                              >
                                {allSelected ? "clear" : "all"}
                              </button>
                            </span>
                          </button>
                          {isOpen && (
                            <div className="flex flex-wrap gap-1 px-3 pb-2">
                              {envs.map(env => {
                                const key = `${ns}/${env}`;
                                const sel = selectedEnvironments.has(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleEnv(ns, env)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                                      sel
                                        ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                                        : "bg-white/[0.03] text-zinc-500 border-white/10 hover:border-white/20 hover:text-zinc-300"
                                    }`}
                                  >
                                    {sel && "✓ "}{env}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
            <p className="text-[10px] text-zinc-600">
              {selectedEnvironments.size > 0
                ? `${selectedEnvironments.size} environment(s) selected`
                : "Leave empty for unrestricted access."}
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !username.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Edit User Dialog                                                   //
// ------------------------------------------------------------------ //

function EditUserDialog({
  open,
  user,
  onClose,
  onUpdated,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { token } = useWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "developer">("developer");
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<string>>(new Set());
  const [availableEnvPairs, setAvailableEnvPairs] = useState<{ ns: string; env: string }[]>([]);
  const [loadingEnvPairs, setLoadingEnvPairs] = useState(false);
  const [expandedNs, setExpandedNs] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnvPairs = async () => {
    if (!token) return;
    setLoadingEnvPairs(true);
    setAvailableEnvPairs([]);
    try {
      const envs = await api.metaEnvironments(token);
      const pairs: { ns: string; env: string }[] = [];
      for (const [ns, envList] of Object.entries(envs.environments || {})) {
        for (const env of envList as string[]) {
          pairs.push({ ns, env });
        }
      }
      setAvailableEnvPairs(pairs);
    } catch {
      setAvailableEnvPairs([]);
    } finally {
      setLoadingEnvPairs(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setRole(user.role as "admin" | "developer");
      setSelectedEnvironments(new Set(user.scopes || []));
      setExpandedNs(new Set());
      setStatus(user.status as "active" | "disabled");
      setError(null);
      void loadEnvPairs();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEnv = (ns: string, env: string) => {
    const key = `${ns}/${env}`;
    setSelectedEnvironments(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleNs = (ns: string, envs: string[]) => {
    setSelectedEnvironments(prev => {
      const next = new Set(prev);
      const allSelected = envs.every(e => next.has(`${ns}/${e}`));
      if (allSelected) {
        envs.forEach(e => next.delete(`${ns}/${e}`));
      } else {
        envs.forEach(e => next.add(`${ns}/${e}`));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const scopes = selectedEnvironments.size > 0
      ? Array.from(selectedEnvironments)
      : [];

    setLoading(true);
    setError(null);
    try {
      await api.updateUser(token!, user.user_id, {
        email: email.trim() || "",
        role,
        scopes,
        status,
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Edit User: {user?.username}
          </DialogTitle>
          <DialogDescription>Update email, role, scopes, or disable this account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-9.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Role</Label>
            <div className="flex gap-2">
              {(["developer", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    role === r
                      ? r === "admin"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-violet-500/40 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/15"
                  }`}
                >
                  {r === "admin" ? "Admin" : "Developer"}
                </button>
              ))}
            </div>
          </div>

          {/* Allowed Namespaces & Environments */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Allowed Namespaces & Environments</Label>
            {loadingEnvPairs ? (
              <Skeleton className="h-16 bg-white/10 rounded-lg" />
            ) : availableEnvPairs.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No environments available.</p>
            ) : (
              <>
                {selectedEnvironments.size === 0 && (
                  <p className="text-[11px] text-violet-400/80 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Nothing selected = full access
                  </p>
                )}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(() => {
                  const grouped = new Map<string, string[]>();
                  availableEnvPairs.forEach(p => {
                    if (!grouped.has(p.ns)) grouped.set(p.ns, []);
                    grouped.get(p.ns)!.push(p.env);
                  });
                  return Array.from(grouped.entries()).map(([ns, envs]) => {
                    const isOpen = expandedNs.has(ns);
                    const selectedInNs = envs.filter(e => selectedEnvironments.has(`${ns}/${e}`)).length;
                    const allSelected = selectedInNs === envs.length;
                    return (
                      <div key={ns} className="border-b border-white/5 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedNs(prev => {
                              const next = new Set(prev);
                              if (next.has(ns)) next.delete(ns); else next.add(ns);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors text-left"
                        >
                          <span className="flex items-center gap-2">
                            <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                            <span className="text-xs font-medium text-zinc-300">{ns}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            {selectedInNs > 0 && (
                              <span className={`text-[10px] font-medium ${allSelected ? "text-violet-400" : "text-zinc-500"}`}>
                                {selectedInNs}/{envs.length}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleNs(ns, envs); }}
                              className="text-[10px] text-zinc-600 hover:text-violet-400 transition-colors"
                            >
                              {allSelected ? "clear" : "all"}
                            </button>
                          </span>
                        </button>
                        {isOpen && (
                          <div className="flex flex-wrap gap-1 px-3 pb-2">
                            {envs.map(env => {
                              const key = `${ns}/${env}`;
                              const sel = selectedEnvironments.has(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleEnv(ns, env)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                                    sel
                                      ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                                      : "bg-white/[0.03] text-zinc-500 border-white/10 hover:border-white/20 hover:text-zinc-300"
                                  }`}
                                >
                                  {sel && "✓ "}{env}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              </>
            )}
            <p className="text-[10px] text-zinc-600">
              {selectedEnvironments.size > 0
                ? `${selectedEnvironments.size} environment(s) selected`
                : "Leave empty for unrestricted access."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Status</Label>
            <div className="flex gap-2">
              {(["active", "disabled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    status === s
                      ? s === "active"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/15"
                  }`}
                >
                  {s === "active" ? "Active" : "Disabled"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Temp Password Toast                                                //
// ------------------------------------------------------------------ //

function TempPasswordToast({
  username,
  tempPassword,
  emailSent,
  onClose,
}: {
  username: string;
  tempPassword: string;
  emailSent: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full rounded-xl border border-violet-500/30 bg-zinc-900/95 p-5 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Shield className="w-4.5 h-4.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-100">
            User Created: {username}
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Temporary password — copy it now. It won&apos;t be shown again.
          </p>
          {emailSent && (
            <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Welcome email sent to the user.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-violet-300 select-all">
              {tempPassword}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void copyToClipboard()}
              className="h-8 w-8 text-zinc-400 hover:text-white shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Main Page                                                          //
// ------------------------------------------------------------------ //

export default function AdminUsersPage() {
  const { token } = useWorkspace();
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [dialog, setDialog] = useState<DialogMode>({ kind: "none" });
  const [toast, setToast] = useState<{
    username: string;
    tempPassword: string;
    emailSent: boolean;
  } | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<User | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setState({ phase: "loading" });
    try {
      const data = await api.listUsers(token);
      setState({ phase: "ready", users: data.users });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load users.";
      setState({ phase: "error", message: msg });
    }
  }, [token]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteConfirm || !token) return;
    setDeleteLoading(true);
    try {
      await api.deleteUser(token, deleteConfirm.user_id);
      setDeleteConfirm(null);
      void fetchUsers();
    } catch {
      // keep dialog open; error is surface-level
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetConfirm || !token) return;
    setResetLoading(true);
    try {
      const result = await api.resetPassword(token, resetConfirm.user_id);
      setToast({
        username: resetConfirm.username,
        tempPassword: result.temp_password,
        emailSent: result.email_sent,
      });
      setResetConfirm(null);
      void fetchUsers();
    } catch {
      // keep dialog open
    } finally {
      setResetLoading(false);
    }
  };

  // ------------------------------------------------------------------ //
  //  Render                                                             //
  // ------------------------------------------------------------------ //

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Users</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage developer accounts and access scopes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchUsers()}
            className="border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] h-9 rounded-lg text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setDialog({ kind: "create" })}
            className="bg-violet-600 hover:bg-violet-500 text-white h-9 rounded-lg text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create User
          </Button>
        </div>
      </div>

      {/* Content based on state */}
      {state.phase === "loading" && <LoadingSkeleton />}

      {state.phase === "error" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Failed to load users</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">{state.message}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchUsers()}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}

      {state.phase === "ready" && state.users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">No users yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Create your first developer account to give team members access to specific namespaces and environments.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setDialog({ kind: "create" })}
            className="bg-violet-600 hover:bg-violet-500 text-white h-9 rounded-lg text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create First User
          </Button>
        </div>
      )}

      {state.phase === "ready" && state.users.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                    Scopes
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden xl:table-cell">
                    Last Login
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {state.users.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Username */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{user.username}</p>
                          {user.must_change_password && (
                            <p className="text-[10px] text-amber-500/80">
                              Must change password
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {user.email ? (
                        <span className="text-xs text-zinc-400">{user.email}</span>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">—</span>
                      )}
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">{roleBadge(user.role)}</td>
                    {/* Scopes */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.scopes && user.scopes.length > 0 ? (
                          user.scopes.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-[10px] font-mono bg-white/5 border border-white/8 rounded-md px-1.5 py-0.5 text-zinc-400 truncate max-w-[100px]"
                            >
                              <Globe className="h-2.5 w-2.5 text-zinc-500 shrink-0" />
                              {scopeLabel(s)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">None</span>
                        )}
                        {user.scopes && user.scopes.length > 3 && (
                          <span className="text-[10px] text-zinc-600">
                            +{user.scopes.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">{statusBadge(user.status)}</td>
                    {/* Last Login */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-zinc-500">
                        {formatDate(user.last_login)}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDialog({ kind: "edit", user })}
                          className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg"
                          title="Edit user"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResetConfirm(user)}
                          className="h-8 w-8 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                          title="Reset password"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(user)}
                          className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateUserDialog
        open={dialog.kind === "create"}
        onClose={() => setDialog({ kind: "none" })}
        onCreated={(result) =>
          {
            setToast({
              username: result.username,
              tempPassword: result.temp_password,
              emailSent: result.email_sent,
            });
            void fetchUsers();
          }
        }
      />

      <EditUserDialog
        open={dialog.kind === "edit"}
        user={dialog.kind === "edit" ? dialog.user : null}
        onClose={() => setDialog({ kind: "none" })}
        onUpdated={() => void fetchUsers()}
      />

      {/* Reset Password Confirmation */}
      <AlertDialog
        open={resetConfirm !== null}
        onOpenChange={(o) => { if (!o) setResetConfirm(null); }}
      >
        <AlertDialogContent className="border-zinc-800 bg-[#111827]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for{" "}
              <span className="text-zinc-200 font-medium">{resetConfirm?.username}</span>.
              They will be forced to change it on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={resetLoading}
              className="border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleReset()}
              disabled={resetLoading}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {resetLoading ? "Resetting…" : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}
      >
        <AlertDialogContent className="border-zinc-800 bg-[#111827]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="text-zinc-200 font-medium">{deleteConfirm?.username}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteLoading}
              className="border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleteLoading ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temp Password Toast */}
      {toast && (
        <TempPasswordToast
          username={toast.username}
          tempPassword={toast.tempPassword}
          emailSent={toast.emailSent}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Loading Skeleton                                                   //
// ------------------------------------------------------------------ //

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <Skeleton className="h-3 w-32 bg-white/10" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-white/5 flex items-center gap-4">
          <Skeleton className="h-7 w-7 rounded-full bg-white/10" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-24 bg-white/10" />
            <Skeleton className="h-2.5 w-16 bg-white/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-md bg-white/10" />
          <Skeleton className="h-5 w-12 rounded-md bg-white/10" />
        </div>
      ))}
    </div>
  );
}
