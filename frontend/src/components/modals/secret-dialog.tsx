"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError, type SecretMeta } from "@/lib/sem-api";
import { cn } from "@/lib/utils";

const KEY_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  environmentId: string;
  /** When set, the dialog edits an existing secret (key locked, value fetched). */
  editing?: SecretMeta | null;
  onSaved: () => void;
};

export function SecretDialog({ open, onOpenChange, projectId, environmentId, editing, onSaved }: Props) {
  const { call } = useWorkspace();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [isSensitive, setIsSensitive] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingValue, setLoadingValue] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKeyError(null);
    setShowValue(false);
    if (editing) {
      setKey(editing.key);
      setDescription(editing.description ?? "");
      setIsSensitive(editing.is_sensitive);
      setValue("");
      // Fetch the current value so an edit doesn't blank it out.
      setLoadingValue(true);
      call((t) => sem.getSecretValue(t, projectId, environmentId, editing.key))
        .then((r) => setValue(r.value))
        .catch(() => toast.error("Could not load the current value."))
        .finally(() => setLoadingValue(false));
    } else {
      setKey("");
      setValue("");
      setDescription("");
      setIsSensitive(true);
    }
  }, [open, editing, call, projectId, environmentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = key.trim();
    if (!k) {
      setKeyError("Key is required.");
      return;
    }
    if (!KEY_RE.test(k)) {
      setKeyError("Use letters, numbers, underscore, dot, or hyphen (no leading dot/hyphen).");
      return;
    }
    if (!value) {
      setKeyError(null);
      toast.error("Value is required.");
      return;
    }
    setKeyError(null);
    setLoading(true);
    try {
      await call((t) =>
        sem.upsertSecret(t, projectId, environmentId, k, {
          value,
          description: description.trim() || undefined,
          is_sensitive: isSensitive,
        }),
      );
      toast.success(editing ? `Updated ${k}` : `Added ${k}`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save secret");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{editing ? "Edit secret" : "Add secret"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the value or metadata. A new version is recorded." : "Create an encrypted environment variable."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Key</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. DATABASE_URL"
              disabled={!!editing}
              className={cn("bg-black/40 border-white/10 font-mono text-sm", editing && "opacity-60")}
              autoFocus={!editing}
            />
            {keyError && <p className="text-xs text-red-400">{keyError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Value</Label>
            <div className="relative">
              <Input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={loadingValue ? "Loading current value…" : "Enter secret value"}
                disabled={loadingValue}
                className="bg-black/40 border-white/10 font-mono text-sm pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowValue((s) => !s)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                aria-label={showValue ? "Hide value" : "Show value"}
              >
                {loadingValue ? <Loader2 className="h-4 w-4 animate-spin" /> : showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this secret for?"
              rows={2}
              className="bg-black/40 border-white/10 text-sm resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-600"
            />
            Mark as sensitive (masked by default)
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="text-zinc-400">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingValue} className="bg-violet-600 hover:bg-violet-500">
              {loading ? "Saving…" : editing ? "Save changes" : "Create secret"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
