"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  Copy,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Download,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { maskValue, formatIso, cn } from "@/lib/utils";
import { formatUserError } from "@/lib/error-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Tooltip from "@radix-ui/react-tooltip";

import {
  DropdownMenu,

  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { SecretDialog } from "@/components/modals/secret-dialog";
import { BulkImportDialog } from "@/components/modals/bulk-import-dialog";
export type SecretRow = {
  key: string;
  value: string;
  environment: string;
  lastUpdated: string | null;
};

type Props = {
  token: string;
  namespace: string;
  environment: string;
  variables: Record<string, string>;
  lastUpdated: string | null;
  onRefresh: () => void;
};

export function SecretsTable({
  token,
  namespace,
  environment,
  variables,
  lastUpdated,
  onRefresh,
}: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | undefined>();
  const [editValue, setEditValue] = useState<string | undefined>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [secretTimers, setSecretTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});

  // Auto-hide secret after 15 seconds
  const AUTO_HIDE_DELAY_MS = 15000;

  const clearSecretTimer = useCallback((key: string) => {
    setSecretTimers((prev) => {
      if (prev[key]) {
        clearTimeout(prev[key]);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const toggleReveal = useCallback((key: string) => {
    setRevealedSecrets((prev) => {
      const isCurrentlyRevealed = !!prev[key];
      if (isCurrentlyRevealed) {
        // Hiding: clear timer if exists
        clearSecretTimer(key);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev;
        return rest;
      } else {
        // Revealing: set auto-hide timer
        const timer = setTimeout(() => {
          setRevealedSecrets((current) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [key]: __, ...remaining } = current;
            return remaining;
          });
          setSecretTimers((currentTimers) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [key]: ___, ...remainingTimers } = currentTimers;
            return remainingTimers;
          });
        }, AUTO_HIDE_DELAY_MS);
        setSecretTimers((prevTimers) => ({ ...prevTimers, [key]: timer }));
        return { ...prev, [key]: true };
      }
    });
  }, [clearSecretTimer]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(secretTimers).forEach(clearTimeout);
    };
  }, [secretTimers]);

  // Hide all secrets when window loses focus (security measure)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setRevealedSecrets({});
        Object.values(secretTimers).forEach(clearTimeout);
        setSecretTimers({});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [secretTimers]);

  const data: SecretRow[] = useMemo(
    () =>
      Object.entries(variables).map(([key, value]) => ({
        key,
        value,
        environment: `${namespace}/${environment}`,
        lastUpdated,
      })),
    [variables, namespace, environment, lastUpdated]
  );

  // globalReveal will be computed after table is defined

  const copyLine = useCallback((key: string, value: string) => {
    void navigator.clipboard.writeText(`${key}=${value}`);
    toast.success(`Copied ${key} to clipboard`, {
      description: "Variable pair copied in KEY=VALUE format.",
      icon: <Copy className="h-4 w-4 text-violet-400" />,
    });
    // Auto-clear clipboard after 30 seconds for security
    setTimeout(() => {
      try {
        navigator.clipboard.writeText("");
      } catch {
        // Clipboard API unavailable or blocked - silently ignore
      }
    }, 30000);
  }, []);

  const columns = useMemo<ColumnDef<SecretRow>[]>(
    () => [
      {
        accessorKey: "key",
        header: ({ column }) => (
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => column.toggleSorting()}>
             <span>Variable Name</span>
             <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-violet-400/70" />
             </div>
             <span className="font-mono text-xs font-semibold text-zinc-100 tracking-tight">{getValue<string>()}</span>
          </div>
        ),
      },
      {
        accessorKey: "value",
        header: "Current Value",
        cell: ({ row }) => {
          const isRevealed = !!revealedSecrets[row.original.key];
          return (
            <div className="font-mono text-[11px] text-zinc-400 break-all max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[600px] px-2 py-1 rounded bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors">
              {isRevealed ? (
                <span>{row.original.value}</span>
              ) : (
                <span>{maskValue(row.original.value, false)}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "environment",
        header: "Environment",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{getValue<string>()}</span>
          </div>
        ),
      },
      {
        accessorKey: "lastUpdated",
        header: "Last Modified",
        cell: ({ getValue }) => (
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 font-medium">
              {formatIso(getValue<string | null>())}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => {
          const isRevealed = !!revealedSecrets[row.original.key];
          return (
            <div className="flex justify-end pr-2 gap-1">
              <Tooltip.Provider delayDuration={200}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        isRevealed
                          ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          : "text-zinc-500 hover:text-white hover:bg-white/5"
                      )}
                      onClick={() => toggleReveal(row.original.key)}
                      aria-label={isRevealed ? "Hide Secret" : "Reveal Secret"}
                    >
                      {isRevealed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      className="bg-zinc-800 border border-white/10 text-zinc-200 text-[10px] px-2 py-1 rounded-md shadow-xl z-50"
                    >
                      {isRevealed ? "Hide Secret" : "Reveal Secret"}
                      <Tooltip.Arrow className="fill-zinc-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/5 shadow-2xl p-1">
                  <DropdownMenuItem
                    className="rounded-md focus:bg-white/5 cursor-pointer text-xs"
                    onSelect={() =>
                      copyLine(row.original.key, row.original.value)
                    }
                  >
                    <Copy className="mr-3 h-3.5 w-3.5 text-zinc-500" />
                    Copy KEY=value
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-md focus:bg-white/5 cursor-pointer text-xs"
                    onSelect={() => {
                      setEditKey(row.original.key);
                      setEditValue(row.original.value);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-3 h-3.5 w-3.5 text-zinc-500" />
                    Edit Variable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-md text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer text-xs"
                    onSelect={() => setDeleteTarget(row.original.key)}
                  >
                    <Trash2 className="mr-3 h-3.5 w-3.5" />
                    Delete Variable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [revealedSecrets, toggleReveal, copyLine]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _colId, filter) => {
      const q = String(filter).toLowerCase();
      if (!q) return true;
      const k = row.original.key.toLowerCase();
      const v = row.original.value.toLowerCase();
      return k.includes(q) || v.includes(q);
    },
  });

  // Compute globalReveal after table is defined
  const globalReveal = useMemo(() => {
    // Check against filtered rows so toggle respects the search filter
    const filteredRows = table.getFilteredRowModel().rows;
    if (filteredRows.length === 0) return false;
    return filteredRows.every((row) => !!revealedSecrets[row.original.key]);
  }, [revealedSecrets, table]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteKey(token, namespace, environment, deleteTarget);
      toast.success(`Removed ${deleteTarget}`);
      setDeleteTarget(null);
      onRefresh();
    } catch (e) {
      const err = formatUserError(e);
      toast.error(err.title, {
        description: err.description,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-zinc-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Search keys..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-10 pl-9 bg-black/20 border-white/5 rounded-xl text-xs focus-visible:ring-violet-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-xl border transition-all",
                    globalReveal
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]"
                  )}
                  title={globalReveal ? "Hide All Secrets" : "Reveal All Secrets"}
                  onClick={() => {
                    // Toggle based on filtered rows only
                    const filteredRows = table.getFilteredRowModel().rows;
                    if (globalReveal) {
                      // Hide all: clear only the filtered revealed keys
                      setRevealedSecrets((prev) => {
                        const next = { ...prev };
                        for (const row of filteredRows) {
                          delete next[row.original.key];
                        }
                        return next;
                      });
                    } else {
                      // Reveal all: set filtered keys as revealed
                      setRevealedSecrets((prev) => {
                        const next = { ...prev };
                        for (const row of filteredRows) {
                          next[row.original.key] = true;
                        }
                        return next;
                      });
                    }
                  }}
                >
                  {globalReveal ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="bg-zinc-800 border border-white/10 text-zinc-200 text-[10px] px-2 py-1 rounded-md shadow-xl z-50"
                >
                  {globalReveal ? "Hide All Secrets" : "Reveal All Secrets"}
                  <Tooltip.Arrow className="fill-zinc-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl"
            title="Download .env"
            onClick={() => {
              const content = Object.entries(variables)
                .map(([k, v]) => `${k}=${v}`)
                .join("\n");
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${namespace}-${environment}.env`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 text-zinc-400" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="h-10 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl transition-all"
            onClick={() => {
              setEditKey(undefined);
              setEditValue(undefined);
              setDialogOpen(true);
            }}
          >
            Add Secret
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300 font-semibold rounded-xl hidden md:flex"
            onClick={() => setBulkOpen(true)}
          >
            Bulk Import
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-2xl relative">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-white/5 bg-white/[0.02]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-20 text-center text-sm text-zinc-600 italic"
                >
                  No secrets found in this environment.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.01)" }}
                  className="group transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SecretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        token={token}
        namespace={namespace}
        environment={environment}
        initialKey={editKey}
        initialValue={editValue}
        onSaved={onRefresh}
      />

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token}
        namespace={namespace}
        environment={environment}
        current={variables}
        onApplied={onRefresh}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-white/10 rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Delete Variable?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Permanently remove <code className="text-violet-400 bg-violet-400/10 px-1 rounded">{deleteTarget}</code>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={deleting} className="rounded-xl border-white/5 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 rounded-xl"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

