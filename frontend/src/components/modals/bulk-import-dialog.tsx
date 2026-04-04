"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

import {
  parseEnvPayload,
  diffAgainstCurrent,
  type DiffRow,
} from "@/lib/bulk-diff";
import { toast } from "sonner";


type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  namespace: string;
  environment: string;
  current: Record<string, string>;
  onApplied: () => void;
};

function rowBadge(type: DiffRow["type"]) {
  switch (type) {
    case "add":
      return <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">Add</div>;
    case "remove":
      return <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">Remove</div>;
    case "change":
      return <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">Change</div>;
    default:
      return <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-white/5 uppercase tracking-wider">Same</div>;
  }
}

export function BulkImportDialog({
  open,
  onOpenChange,
  token,
  namespace,
  environment,
  current,
  onApplied,
}: Props) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(false);

  const lines = useMemo(() => parseEnvPayload(text), [text]);
  const rows = useMemo(
    () => diffAgainstCurrent(lines, current),
    [lines, current]
  );

  function toPayload(): string {
    return lines.map((l) => `${l.key}=${l.value}`).join("\n");
  }

  async function apply() {
    const payload = toPayload();
    if (!payload.trim()) {
      toast.error("Paste at least one KEY=value line.");
      return;
    }
    setLoading(true);
    try {
      await api.bulkReplace(token, namespace, environment, payload);
      toast.success("Environment synced successfully", {
        description: `${lines.length} variables updated.`,
      });
      onOpenChange(false);
      setText("");
      setStep("edit");
      onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk replace failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setStep("edit");
          setText("");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden border-white/10 bg-[#0A0A0A] p-0 sm:max-w-3xl rounded-2xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        
        <div className="flex max-h-[90vh] flex-col p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
               <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Bulk Variable Sync
                    <div className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400 font-bold uppercase tracking-widest">
                      {step === 'edit' ? 'Step 1: Edit' : 'Step 2: Review'}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 text-sm mt-2">
                    {step === 'edit' 
                      ? "Paste your .env content below. This will replace the entire environment configuration."
                      : "Carefully review the changes before applying them to the production environment."}
                  </DialogDescription>
               </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {step === "edit" ? (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="relative">
                  <div className="absolute top-3 right-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest pointer-events-none">
                    .env format
                  </div>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={"STRIPE_KEY=sk_test_...\nDB_URL=postgresql://..."}
                    className="min-h-[350px] font-mono text-xs bg-black/40 border-white/5 rounded-xl focus-visible:ring-violet-500/40 p-4 resize-none scrollbar-thin"
                  />
                </div>
                
                <DialogFooter className="pt-6 border-t border-white/5 h-20 -mx-8 px-8 mt-4">
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-6 text-zinc-500 hover:text-white">
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl px-8 bg-zinc-100 hover:bg-white text-black font-bold"
                    onClick={() => {
                      if (!parseEnvPayload(text).length) {
                        toast.error("No valid KEY=value pairs detected.");
                        return;
                      }
                      setStep("preview");
                    }}
                  >
                    Review Changes
                  </Button>
                </DialogFooter>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col h-full"
              >
                <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden mb-6">
                  <ScrollArea className="h-[380px]">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 bg-[#111] text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-3">Variable Key</th>
                          <th className="px-6 py-3">Action</th>
                          <th className="px-6 py-3 text-right">Preview</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {rows.map((r) => (
                          <tr
                            key={r.key}
                            className="transition-colors hover:bg-white/[0.01]"
                          >
                            <td className="px-6 py-3 font-mono text-xs text-zinc-200">
                              {r.key}
                            </td>
                            <td className="px-6 py-3">{rowBadge(r.type)}</td>
                            <td className="px-6 py-3 text-right font-mono text-[10px] text-zinc-500">
                              <div className="flex items-center justify-end gap-2">
                                {r.type === "add" && <><span className="text-zinc-700 italic">none</span> <span className="text-emerald-500 font-bold">→</span> <span className="text-zinc-300">present</span></>}
                                {r.type === "remove" && <><span className="text-zinc-300">present</span> <span className="text-red-500 font-bold">→</span> <span className="text-zinc-700 italic">removed</span></>}
                                {r.type === "change" && <><span className="line-through opacity-50">modified</span> <span className="text-amber-500 font-bold">→</span> <span className="text-zinc-200">updated</span></>}
                                {r.type === "same" && <span className="opacity-30 italic">No change</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>

                <DialogFooter className="pt-6 border-t border-white/5 h-20 -mx-8 px-8 mt-auto">
                  <Button variant="ghost" onClick={() => setStep("edit")} className="rounded-xl px-6 text-zinc-500 hover:text-white">
                    Return to Editor
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => void apply()} 
                    disabled={loading}
                    className="rounded-xl px-8 font-bold bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                  >
                    {loading ? (
                       <div className="flex items-center gap-2">
                          <div className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Syncing...</span>
                       </div>
                    ) : "Overwrite Environment"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

