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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  parseEnvPayload,
  diffAgainstCurrent,
  type DiffRow,
} from "@/lib/bulk-diff";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      return <Badge variant="success">Add</Badge>;
    case "remove":
      return <Badge variant="destructive">Remove</Badge>;
    case "change":
      return <Badge variant="warning">Change</Badge>;
    default:
      return <Badge variant="secondary">Unchanged</Badge>;
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
      toast.success("Environment replaced");
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
      <DialogContent className="max-h-[90vh] overflow-hidden border-zinc-800 bg-[#111827] p-0 sm:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="flex max-h-[90vh] flex-col"
        >
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>Bulk import</DialogTitle>
              <DialogDescription>
                Paste <code className="text-violet-300">.env</code> style
                lines. This replaces the entire environment (same as server bulk
                replace).
              </DialogDescription>
            </DialogHeader>
          </div>

          {step === "edit" ? (
            <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"API_KEY=...\nDATABASE_URL=..."}
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!parseEnvPayload(text).length) {
                      toast.error("No valid KEY=value pairs.");
                      return;
                    }
                    setStep("preview");
                  }}
                >
                  Preview changes
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
              <ScrollArea className="h-[280px] rounded-lg border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#0d111c] text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-3 font-medium">Key</th>
                      <th className="p-3 font-medium">Change</th>
                      <th className="p-3 font-medium">Before → After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <motion.tr
                        key={r.key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "border-t border-zinc-800/80 transition-colors hover:bg-zinc-800/40"
                        )}
                      >
                        <td className="p-3 font-mono text-xs text-zinc-200">
                          {r.key}
                        </td>
                        <td className="p-3">{rowBadge(r.type)}</td>
                        <td className="max-w-[280px] truncate p-3 font-mono text-xs text-zinc-400">
                          {r.type === "add" && `∅ → ${r.after}`}
                          {r.type === "remove" && `${r.before} → ∅`}
                          {r.type === "change" && `${r.before} → ${r.after}`}
                          {r.type === "same" && "(unchanged)"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("edit")}>
                  Back
                </Button>
                <Button variant="destructive" onClick={() => void apply()} disabled={loading}>
                  {loading ? "Applying…" : "Confirm replace"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
