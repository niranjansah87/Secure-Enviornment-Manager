"use client";

import { useCallback, useEffect, useState, use } from "react";
import { KeyRound, Plus, Trash2, Copy, CheckCircle2, AlertCircle, RefreshCw, Clock, Eye, EyeOff } from "lucide-react";
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

export default function ApiKeysPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace } = use(params);
  const { token } = useWorkspace();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResult>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [description, setDescription] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [selectedNamespaces, setSelectedNamespaces] = useState<Set<string>>(new Set());
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [customKeyError, setCustomKeyError] = useState("");

  const loadKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.listKeys(token, namespace);
      setKeys(res.keys ?? []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [token, namespace]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const validateCustomKey = (key: string): boolean => {
    if (!key) return false;
    if (key.length < 16) {
      setCustomKeyError("Key must be at least 16 characters");
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

    setCreating(true);
    setNewKey(null);
    try {
      const options: {
        description: string;
        validity_days: number;
        custom_key?: string;
        namespaces?: string[];
      } = {
        description,
        validity_days: validityDays,
      };

      if (useCustomKey && customKey) {
        options.custom_key = customKey;
      }

      // If specific namespaces selected, use them; otherwise empty = all namespaces
      if (selectedNamespaces.size > 0) {
        options.namespaces = Array.from(selectedNamespaces);
      }

      const res = await api.createKey(token, namespace, options);
      setNewKey(res);
      setKeys(prev => [...prev, {
        key_id: res.key_id,
        created_at: new Date().toISOString(),
        last_used: null,
        created_by: "admin",
        description: res.description,
        namespaces: res.namespaces,
        expires_at: res.expires_at,
        status: "active",
        custom_key: Boolean(options.custom_key),
      }]);
      toast.success("API key created", {
        description: "Copy and store this key securely. It will not be shown again.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      });
      setShowCreateDialog(false);
      resetForm();
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
    setSelectedNamespaces(new Set());
    setCustomKeyError("");
  };

  const openCreateDialog = async () => {
    setShowCreateDialog(true);
    resetForm();
    // Load available namespaces
    setLoadingNamespaces(true);
    try {
      const envs = await api.metaEnvironments(token);
      const allNamespaces = Object.keys(envs.environments || {});
      setAvailableNamespaces(allNamespaces);
    } catch {
      setAvailableNamespaces([]);
    } finally {
      setLoadingNamespaces(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!token) return;
    setRevoking(keyId);
    try {
      await api.revokeKey(token, namespace, keyId);
      setKeys(prev => prev.filter(k => k.key_id !== keyId));
      toast.success("API key revoked", {
        description: `Key ${keyId} has been permanently revoked.`,
      });
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
        description="Manage API keys for namespace access."
        actionHref="/login"
        actionLabel="Login"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">API Keys</h2>
          <p className="text-sm text-zinc-500">
            Manage API keys for <span className="font-mono text-violet-400">{namespace}</span> namespace.
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
      ) : keys.length === 0 && !newKey ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys"
          description={`No API keys exist for ${namespace}. Create one to enable programmatic access.`}
        />
      ) : (
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
                        <code className="text-sm font-mono text-zinc-200">{key.key_id}</code>
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
                        {key.namespaces && key.namespaces.length > 0 ? (
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
                              All Namespaces
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
                      onClick={() => void handleRevokeKey(key.key_id)}
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
              Custom keys can be provided (16-64 chars, alphanumeric + underscore/hyphen).
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
        <DialogContent className="bg-zinc-900 border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-violet-400" />
              Create API Key
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure and create a new API key for {namespace} namespace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-zinc-300">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Production CI/CD pipeline"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Validity Period */}
            <div className="space-y-2">
              <Label htmlFor="validity" className="text-sm font-medium text-zinc-300">Validity Period</Label>
              <select
                id="validity"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer"
              >
                {VALIDITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Allowed Namespaces */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-300">Allowed Namespaces</Label>
              {loadingNamespaces ? (
                <div className="text-sm text-zinc-500">Loading namespaces...</div>
              ) : availableNamespaces.length === 0 ? (
                <div className="text-sm text-zinc-500">No namespaces available</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-white/10 rounded-lg p-3 bg-black/20">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <input
                      type="checkbox"
                      id="selectAllNamespaces"
                      checked={selectedNamespaces.size === availableNamespaces.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNamespaces(new Set(availableNamespaces));
                        } else {
                          setSelectedNamespaces(new Set());
                        }
                      }}
                      className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                    />
                    <Label htmlFor="selectAllNamespaces" className="text-zinc-300 font-medium cursor-pointer">
                      Select All
                    </Label>
                  </div>
                  {availableNamespaces.map((ns) => (
                    <div key={ns} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`ns-${ns}`}
                        checked={selectedNamespaces.has(ns)}
                        onChange={(e) => {
                          const newSet = new Set(selectedNamespaces);
                          if (e.target.checked) {
                            newSet.add(ns);
                          } else {
                            newSet.delete(ns);
                          }
                          setSelectedNamespaces(newSet);
                        }}
                        className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                      />
                      <Label htmlFor={`ns-${ns}`} className="text-zinc-300 cursor-pointer">
                        <span className="font-mono text-violet-400">{ns}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-500">
                {selectedNamespaces.size === 0
                  ? "No selection = access to all namespaces"
                  : `${selectedNamespaces.size} namespace(s) selected`}
              </p>
            </div>

            {/* Custom Key Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomKey"
                  checked={useCustomKey}
                  onChange={(e) => setUseCustomKey(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                />
                <Label htmlFor="useCustomKey" className="text-zinc-300">
                  Provide custom API key
                </Label>
              </div>

              {useCustomKey && (
                <div className="pl-6 space-y-2">
                  <Input
                    value={customKey}
                    onChange={(e) => {
                      setCustomKey(e.target.value);
                      if (e.target.value) validateCustomKey(e.target.value);
                      else setCustomKeyError("");
                    }}
                    placeholder="Enter custom key (16-64 characters)"
                    className={"w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" + (customKeyError ? " border-red-500" : "")}
                  />
                  {customKeyError && (
                    <p className="text-xs text-red-400">{customKeyError}</p>
                  )}
                  <p className="text-xs text-zinc-500">
                    16-64 characters, letters, numbers, underscores, hyphens only.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateKey()}
              disabled={creating || (useCustomKey && Boolean(customKeyError))}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {creating ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}