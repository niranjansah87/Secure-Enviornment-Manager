"use client";

import { useMemo, useState, useCallback } from "react";
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
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { maskValue, formatIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [showValues, setShowValues] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | undefined>();
  const [editValue, setEditValue] = useState<string | undefined>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const copyLine = useCallback((key: string, value: string) => {
    void navigator.clipboard.writeText(`${key}=${value}`);
    toast.success("Copied to clipboard");
  }, []);

  const columns = useMemo<ColumnDef<SecretRow>[]>(
    () => [
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-violet-300">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => (
          <div className="font-mono text-xs text-zinc-400 break-all max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[400px] xl:max-w-[600px]">
            {maskValue(row.original.value, showValues)}
          </div>
        ),
      },
      {
        accessorKey: "environment",
        header: "Environment",
        cell: ({ getValue }) => (
          <Badge variant="secondary" className="font-mono text-[10px]">
            {getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: "lastUpdated",
        header: "Last updated",
        cell: ({ getValue }) => (
          <span className="text-xs text-zinc-500">
            {formatIso(getValue<string | null>())}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  copyLine(row.original.key, row.original.value)
                }
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy KEY=value
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setEditKey(row.original.key);
                  setEditValue(row.original.value);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300"
                onSelect={() => setDeleteTarget(row.original.key)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [showValues, copyLine]
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteKey(token, namespace, environment, deleteTarget);
      toast.success(`Deleted ${deleteTarget}`);
      setDeleteTarget(null);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search keys or values…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowValues((s) => !s)}
          >
            {showValues ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {showValues ? "Hide" : "Reveal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
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
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditKey(undefined);
              setEditValue(undefined);
              setDialogOpen(true);
            }}
          >
            Add secret
          </Button>
          <Button type="button" size="sm" onClick={() => setBulkOpen(true)}>
            Bulk import
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111827]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-800 bg-[#0d111c]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  No secrets match your search.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={false}
                  whileHover={{ backgroundColor: "rgba(39, 39, 42, 0.35)" }}
                  className="border-b border-zinc-800/80"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <code className="text-violet-300">{deleteTarget}</code>{" "}
              from {namespace}/{environment}. This cannot be undone from the UI
              without restoring from history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
