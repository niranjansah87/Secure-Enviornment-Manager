"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEY_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  namespace: string;
  environment: string;
  initialKey?: string;
  initialValue?: string;
  onSaved: () => void;
};

export function SecretDialog({
  open,
  onOpenChange,
  token,
  namespace,
  environment,
  initialKey,
  initialValue,
  onSaved,
}: Props) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKey(initialKey ?? "");
      setValue(initialValue ?? "");
      setKeyError(null);
    }
  }, [open, initialKey, initialValue]);

  async function submit() {
    const k = key.trim();
    if (!k) {
      setKeyError("Key is required.");
      return;
    }
    if (!KEY_RE.test(k)) {
      setKeyError(
        "Invalid key. Use letters, numbers, underscore, dot, or hyphen."
      );
      return;
    }
    setKeyError(null);
    setLoading(true);
    try {
      await api.patchSecrets(token, namespace, environment, {
        [k]: value,
      });
      toast.success(initialKey ? "Secret updated" : "Secret added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-zinc-800 bg-[#111827] p-0 sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="p-6"
        >
          <DialogHeader>
            <DialogTitle>
              {initialKey ? "Edit secret" : "Add secret"}
            </DialogTitle>
            <DialogDescription>
              Keys must match server validation rules. Values are encrypted at
              rest on the API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="secret-key">Key</Label>
              <Input
                id="secret-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="DATABASE_URL"
                disabled={!!initialKey}
                className="font-mono text-sm"
              />
              {keyError && (
                <p className="text-xs text-red-400">{keyError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret-value">Value</Label>
              <Input
                id="secret-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="••••••••"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
