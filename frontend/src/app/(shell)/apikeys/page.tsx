"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, CheckCircle2, AlertCircle, RefreshCw, Clock, Eye, EyeOff, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/forms/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIso } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiKeyInfo = {
  key_id: string;
  created_at: string;
  last_used: string | null;
  created_by: string;
  description: string;
  namespaces: string[];
  environments: string[];
  expires_at: string | null;
  status: string;
  custom_key: boolean;
};

type NewKeyResult = {
  key: string;
  key_id: string;
  namespace: string;
  description: string;
  validity_days: number;
  expires_at: string | null;
  namespaces: string[];
  message: string;
} | null;

const VALIDITY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "1 year" },
  { value: 0, label: "No expiry" },
];

export default function ApiKeysPage() {
  const { token, environments } = useWorkspace();
  const [keysByNamespace, setKeysByNamespace] = useState<Record<string, ApiKeyInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResult>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [description, setDescription] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKey, setCustomKey] = useState("");
  // selectedEnvironments stores "namespace/environment" strings
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<string>>(new Set());
  const [availableEnvPairs, setAvailableEnvPairs] = useState<{ns: string; env: string}[]>([]);
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [customKeyError, setCustomKeyError] = useState("");

  const loadKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const allKeys: Record<string, ApiKeyInfo[]> = {};
      const namespaces = Object.keys(environments || {});

      for (const ns of namespaces) {
        try {
          const res = await api.listKeys(token, ns);
          if (res.keys && res.keys.length > 0) {
            allKeys[ns] = res.keys;
          }
        } catch {
          // Skip namespaces we can't access
        }
      }
      setKeysByNamespace(allKeys);
    } catch {
      setKeysByNamespace({});
    } finally {
      setLoading(false);
    }
  }, [token, environments]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const validateCustomKey = (key: string): boolean => {
    if (!key) return false;
    if (key.length < 8) {
      setCustomKeyError("Key must be at least 8 characters");
      return false;
    }
    if (key.length > 64) {
      setCustomKeyError("Key must be at most 64 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      setCustomKeyError("Only letters, numbers, underscores, and hyphens allowed");
      return false;
    }
    setCustomKeyError("");
    return true;
  };

  const handleCreateKey = async () => {
    if (!token) return;

    // Validate custom key if provided
    if (useCustomKey && customKey) {
      if (!validateCustomKey(customKey)) {
        return;
      }
    }

    // Derive storage namespace: first selected env's ns, first available, or fallback
    const storageNs =
      selectedEnvironments.size > 0
        ? Array.from(selectedEnvironments)[0].split("/")[0]
        : (availableEnvPairs[0]?.ns ?? "global");

    setCreating(true);
    setNewKey(null);
    try {
      const options: {
        description: string;
        validity_days: number;
        custom_key?: string;
        environments?: string[];
      } = {
        description,
        validity_days: validityDays,
      };

      if (useCustomKey && customKey) {
        options.custom_key = customKey;
      }

      // If specific environments selected, send them; empty = all access
      if (selectedEnvironments.size > 0) {
        options.environments = Array.from(selectedEnvironments);
      }

      const res = await api.createKey(token, storageNs, options);
      setNewKey(res);
      toast.success("API key created", {
        description: "Copy and store this key securely. It will not be shown again.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });
      setShowCreateDialog(false);
      resetForm();
      void loadKeys();
    } catch {
      toast.error("Failed to create API key", {
        description: "You may not have administrator privileges.",
        icon: <AlertCircle className="h-4 w-4 text-red-400" />,
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setValidityDays(30);
    setUseCustomKey(false);
    setCustomKey("");
    setSelectedEnvironments(new Set());
    setCustomKeyError("");
  };

  const openCreateDialog = async () => {
    setShowCreateDialog(true);
    resetForm();
    // Load available namespaces
    setLoadingNamespaces(true);
    try {
      const envs = await api.metaEnvironments(token);
      const pairs: {ns: string; env: string}[] = [];
      for (const [ns, envList] of Object.entries(envs.environments || {})) {
        for (const env of (envList as string[])) {
          pairs.push({ ns, env });
        }
      }
      setAvailableEnvPairs(pairs);
    } catch {
      setAvailableEnvPairs([]);
    } finally {
      setLoadingNamespaces(false);
    }
  };

  const handleRevokeKey = async (namespace: string, keyId: string) => {
    if (!token) return;
    setRevoking(keyId);
    try {
      await api.revokeKey(token, namespace, keyId);
      toast.success("API key revoked", {
        description: `Key ${keyId} has been permanently revoked.`,
      });
      void loadKeys();
    } catch {
      toast.error("Failed to revoke API key", {
        description: "You may not have administrator privileges.",
      });
    } finally {
      setRevoking(null);
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Copied to clipboard", {
        description: "Key copied in plain text. Store it securely.",
      });
      // Auto-clear clipboard after 30 seconds
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
        } catch {
          // ignore
        }
      }, 30000);
    } catch {
      toast.error("Failed to copy", {
        description: "Could not access clipboard.",
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const isKeyVisible = (keyId: string) => visibleKeys.has(keyId);

  const getStatusBadge = (key: ApiKeyInfo) => {
    if (key.status === "revoked") {
      return <Badge variant="destructive" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">Revoked</Badge>;
    }
    if (key.status === "expired" || (key.expires_at && new Date(key.expires_at) < new Date())) {
      return <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">Expired</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
  };

  if (!token) {
    return (
      <EmptyState
        icon={KeyRound}
        title="API token required"
        description="Manage API keys across all namespaces."
        actionHref="/login"
        actionLabel="Login"
      />
    );
  }

  const totalKeys = Object.values(keysByNamespace).reduce((sum, keys) => sum + keys.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">API Keys</h2>
          <p className="text-sm text-zinc-500">
            Manage API keys across all namespaces. {totalKeys > 0 && <span className="text-violet-400">{totalKeys} total key(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadKeys()}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void openCreateDialog()}
            className="bg-zinc-100 hover:bg-white text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Key
          </Button>
        </div>
      </div>

      {/* New Key Result */}
      {newKey && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              New API Key Created
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Copy this key now. It will not be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-sm text-emerald-300 bg-black/30 rounded-lg px-4 py-3 break-all">
                {showNewKey ? newKey.key : "•".repeat(24)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewKey(!showNewKey)}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              >
                {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyKey(newKey.key)}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <span>Key ID: <code className="text-violet-400">{newKey.key_id}</code></span>
              <span>Namespace: <code className="text-violet-400">{newKey.namespace}</code></span>
              {newKey.expires_at && (
                <span>Expires: <code className="text-amber-400">{formatIso(newKey.expires_at)}</code></span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewKey(null)}
              className="mt-3 text-zinc-400 hover:text-zinc-200"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : totalKeys === 0 && !newKey ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys"
          description="Create your first API key to enable programmatic access."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(keysByNamespace).map(([ns, keys]) => (
            <div key={ns}>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <span className="font-mono text-violet-400">{ns}</span>
                <span className="text-zinc-600">({keys.length} key{keys.length !== 1 ? "s" : ""})</span>
              </h3>
              <div className="space-y-4">
                {keys.map((key) => (
                  <Card key={key.key_id} className="border-white/5 bg-black/40 backdrop-blur-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <KeyRound className="w-6 h-6 text-violet-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono text-zinc-200">
                                {isKeyVisible(key.key_id) ? key.key_id : "•".repeat(key.key_id.length)}
                              </code>
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility(key.key_id)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                title={isKeyVisible(key.key_id) ? "Hide key ID" : "Show key ID"}
                              >
                                {isKeyVisible(key.key_id) ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyKey(key.key_id)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                title="Copy key ID"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {getStatusBadge(key)}
                              {key.custom_key && (
                                <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 space-y-1">
                              <div>Created: {formatIso(key.created_at)}</div>
                              <div>Last used: {key.last_used ? formatIso(key.last_used) : "Never"}</div>
                              <div>Created by: <span className="text-violet-400">{key.created_by}</span></div>
                              {key.description && (
                                <div className="text-zinc-400 mt-1">Description: {key.description}</div>
                              )}
                              {key.environments && key.environments.length > 0 ? (
                                <div className="mt-1">
                                  <span className="text-zinc-500">Allowed environments: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {key.environments.map(e => (
                                      <Badge key={e} variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono">
                                        {e}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ) : key.namespaces && key.namespaces.length > 0 ? (
                                <div className="mt-1">
                                  <span className="text-zinc-500">Allowed namespaces: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {key.namespaces.map(ns => (
                                      <Badge key={ns} variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                                        {ns}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    All Access
                                  </Badge>
                                </div>
                              )}
                              {key.expires_at && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span className="text-amber-400">Expires: {formatIso(key.expires_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {key.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRevokeKey(ns, key.key_id)}
                            disabled={revoking === key.key_id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {revoking === key.key_id ? "Revoking..." : "Revoke"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-white/5 bg-zinc-900/40">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">About API Keys</h3>
          <ul className="space-y-2 text-xs text-zinc-500">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-0.5">•</span>
              API keys provide programmatic access to secrets without using the web dashboard.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">•</span>
              Master token and dashboard password have full admin access to manage keys.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              Keys can have optional expiry dates and limited namespace access.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              Custom keys can be provided (8-64 chars, alphanumeric + underscore/hyphen).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-zinc-400 mt-0.5">•</span>
              Use header: <code className="text-zinc-300">Authorization: Bearer &lt;your-api-key&gt;</code>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-zinc-100 max-w-lg">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-3 text-base">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4 text-violet-400" />
              </div>
              Create API Key
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs ml-11">
              Grant programmatic access to specific environments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Production CI/CD pipeline"
                className="bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 h-9"
              />
            </div>

            {/* Validity Period - pill buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Validity Period</Label>
              <div className="flex flex-wrap gap-1.5">
                {VALIDITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValidityDays(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      validityDays === opt.value
                        ? "bg-violet-600/80 text-white border-violet-500 shadow-sm shadow-violet-500/20"
                        : "bg-white/5 text-zinc-400 border-white/8 hover:border-white/20 hover:text-zinc-200 hover:bg-white/8"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Access Scope */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Access Scope</Label>
                {selectedEnvironments.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEnvironments(new Set())}
                    className="text-xs text-zinc-600 hover:text-violet-400 transition-colors"
                  >
                    Clear → full access
                  </button>
                )}
              </div>

              {selectedEnvironments.size === 0 && !loadingNamespaces && availableEnvPairs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs text-violet-300">Full access — all namespaces and environments</span>
                </div>
              )}

              {loadingNamespaces ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-20 bg-white/5" />
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-14 rounded-lg bg-white/5" />
                      <Skeleton className="h-7 w-18 rounded-lg bg-white/5" />
                      <Skeleton className="h-7 w-16 rounded-lg bg-white/5" />
                    </div>
                  </div>
                </div>
              ) : availableEnvPairs.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No environments found</p>
              ) : (
                <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                  {Object.entries(
                    availableEnvPairs.reduce<Record<string, string[]>>((acc, { ns, env }) => {
                      (acc[ns] = acc[ns] || []).push(env);
                      return acc;
                    }, {})
                  ).map(([ns, envList]) => {
                    const allNsSelected = envList.every(env => selectedEnvironments.has(`${ns}/${env}`));
                    return (
                      <div key={ns}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-semibold text-violet-400">{ns}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newSet = new Set(selectedEnvironments);
                              if (allNsSelected) {
                                envList.forEach(env => newSet.delete(`${ns}/${env}`));
                              } else {
                                envList.forEach(env => newSet.add(`${ns}/${env}`));
                              }
                              setSelectedEnvironments(newSet);
                            }}
                            className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                          >
                            {allNsSelected ? "deselect all" : "select all"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {envList.map(env => {
                            const scopeKey = `${ns}/${env}`;
                            const selected = selectedEnvironments.has(scopeKey);
                            return (
                              <button
                                key={scopeKey}
                                type="button"
                                onClick={() => {
                                  const newSet = new Set(selectedEnvironments);
                                  if (selected) newSet.delete(scopeKey);
                                  else newSet.add(scopeKey);
                                  setSelectedEnvironments(newSet);
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                                  selected
                                    ? "bg-violet-600/25 border-violet-500/50 text-violet-200 shadow-sm shadow-violet-500/10"
                                    : "bg-white/4 border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300 hover:bg-white/8"
                                }`}
                              >
                                {selected && <span className="mr-1 text-violet-400 text-[10px]">✓</span>}
                                {env}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Key toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setUseCustomKey(!useCustomKey); setCustomKey(""); setCustomKeyError(""); }}
                className="flex items-center gap-3 group"
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${useCustomKey ? "bg-violet-600" : "bg-zinc-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useCustomKey ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Provide custom key</span>
              </button>
              {useCustomKey && (
                <div className="ml-12 space-y-1.5">
                  <Input
                    value={customKey}
                    onChange={(e) => { setCustomKey(e.target.value); if (e.target.value) validateCustomKey(e.target.value); else setCustomKeyError(""); }}
                    placeholder="8–64 characters"
                    className={`bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 h-9 font-mono text-sm ${customKeyError ? "border-red-500/60" : ""}`}
                  />
                  {customKeyError && <p className="text-xs text-red-400">{customKeyError}</p>}
                  <p className="text-xs text-zinc-600">Letters, numbers, underscores, hyphens only</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-white/5 gap-2">
            <div className="flex-1 flex items-center">
              <span className="text-xs text-zinc-600">
                {selectedEnvironments.size === 0
                  ? "Scope: all environments"
                  : `Scope: ${selectedEnvironments.size} environment${selectedEnvironments.size > 1 ? "s" : ""}`}
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={() => { setShowCreateDialog(false); resetForm(); }}
              className="text-zinc-400 hover:text-zinc-200 h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateKey()}
              disabled={creating || (useCustomKey && Boolean(customKeyError))}
              className="bg-violet-600 hover:bg-violet-500 text-white h-9 px-4"
            >
              {creating ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Creating…</>
              ) : (
                <><Plus className="w-3.5 h-3.5 mr-2" />Create Key</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}