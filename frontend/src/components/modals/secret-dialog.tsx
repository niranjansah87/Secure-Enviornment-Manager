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
import { cn } from "@/lib/utils";


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
      <DialogContent className="p-0 border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden sm:max-w-[440px] rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-8"
        >
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              {initialKey ? "Update Secret" : "New Environment Variable"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm leading-relaxed mt-2">
              Configure your environment variables. Keys must be unique and follow standard naming conventions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="secret-key" className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">
                Variable Key
              </Label>
              <Input
                id="secret-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. STRIPE_API_KEY"
                disabled={!!initialKey}
                className={cn(
                  "h-12 bg-black/40 border-white/5 rounded-xl font-mono text-sm focus-visible:ring-violet-500/40 transition-all",
                  initialKey && "opacity-50 grayscale"
                )}
              />
              {keyError && (
                <motion.p 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-500 mt-1 ml-1 font-medium"
                >
                  {keyError}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret-value" className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">
                Secret Value
              </Label>
              <div className="relative group">
                <Input
                  id="secret-value"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 bg-black/40 border-white/5 rounded-xl font-mono text-sm focus-visible:ring-violet-500/40 pr-10 transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-600 ml-1">
                This value will be encrypted and hidden by default in the dashboard.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-10 gap-3 border-t border-white/5 pt-8 -mx-8 px-8">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl h-11 px-6 text-zinc-400 hover:text-white hover:bg-white/5 font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
               type="button" 
               className="rounded-xl h-11 px-8 bg-zinc-100 hover:bg-white text-black font-bold shadow-lg shadow-white/5 flex-1 sm:flex-none transition-all active:scale-95"
               onClick={() => void submit()} 
               disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                   <div className="h-3 w-3 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin" />
                   <span>Saving...</span>
                </div>
              ) : (
                initialKey ? "Update Variable" : "Create Secret"
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

