"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, Plus, RefreshCw } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/context/workspace-context";
import { sem, ApiError } from "@/lib/sem-api";
import { parseEnvPayload } from "@/lib/bulk-diff";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  environmentId?: string;
  envId?: string;
  existingKeys?: string[];
  onApplied?: () => void;
  onImported?: () => void;
};

export function BulkImportDialog({ open, onOpenChange, projectId, environmentId, envId, existingKeys = [], onApplied, onImported }: Props) {
  const effectiveEnvId = environmentId || envId || "";
  const effectiveCallback = onImported || onApplied || (() => {});
  const { call } = useWorkspace();
  const [text, setText] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  const parsed = useMemo(() => parseEnvPayload(text), [text]);
  const existing = useMemo(() => new Set(existingKeys), [existingKeys]);
  const added = parsed.filter((l) => !existing.has(l.key)).length;
  const overwritten = parsed.filter((l) => existing.has(l.key)).length;

  async function apply() {
    if (parsed.length === 0) {
      toast.error("Nothing to import. Paste KEY=value lines.");
      return;
    }
    setApplying(true);
    try {
      const res = await call((t) =>
        sem.bulkReplaceSecrets(
          t,
          projectId,
          effectiveEnvId,
          parsed.map((l) => ({ key: l.key, value: l.value })),
        ),
      );
      toast.success(`Imported ${res.count} variable${res.count === 1 ? "" : "s"}`);
      onOpenChange(false);
      effectiveCallback();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk import failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <FileUp className="h-4 w-4 text-blue-400" /> Bulk import
          </DialogTitle>
          <DialogDescription>Paste a .env file. Lines starting with # are ignored. Existing keys are updated with a new version.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-xs text-zinc-400">.env content</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"DATABASE_URL=postgres://…\nAPI_KEY=sk_live_…\n# comment"}
            rows={10}
            className="bg-black/40 border-white/10 font-mono text-xs resize-none focus:border-blue-500/50"
            autoFocus
          />
          {parsed.length > 0 && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Plus className="h-3.5 w-3.5" /> {added} new
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="h-3.5 w-3.5" /> {overwritten} updated
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={applying} className="text-zinc-400 hover:text-white hover:bg-white/5">
            Cancel
          </Button>
          <Button onClick={() => void apply()} disabled={applying || parsed.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20">
            {applying ? "Importing…" : `Import ${parsed.length || ""} variable${parsed.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
