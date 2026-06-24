"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Shield, MonitorOff, UserCheck, SearchX, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api, type AuditEntry } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Timeline } from "@/components/layout/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function actionVariant(
  action: string
): "default" | "success" | "warning" | "destructive" {
  if (action.includes("DELETE")) return "destructive";
  if (action.includes("CREATE")) return "success";
  if (action.includes("EXPORT") || action.includes("LOGIN")) return "warning";
  return "default";
}

export default function AuditPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string }>;
}) {
  const { namespace, environment } = use(params);
  const { token } = useWorkspace();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [logins, setLogins] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filteredIp, setFilteredIp] = useState<string | null>(null);

  // Filter state
  const [actionFilter, setActionFilter] = useState<string>("");
  // Pagination state
  const [pagination, setPagination] = useState({ offset: 0, limit: 50, total: 0, has_more: false });
  const [pageSize, setPageSize] = useState(50);

  const loadInitial = useCallback(async (size = pageSize) => {
    if (!token) return;
    setLoading(true);
    try {
      const [auditRes, loginRes] = await Promise.all([
        api.audit(token, namespace, environment, size, 0, actionFilter || undefined),
        api.metaLogins(token)
      ]);
      setLogs(auditRes.logs ?? []);
      setPagination(auditRes.pagination ?? { offset: 0, limit: size, total: 0, has_more: false });
      setLogins(loginRes.logins ?? []);
    } catch {
      setLogs([]);
      setLogins([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, namespace, environment, actionFilter]);

  const loadMore = useCallback(async () => {
    if (!token || !pagination.has_more || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextOffset = pagination.offset + pagination.limit;
      const auditRes = await api.audit(token, namespace, environment, pagination.limit, nextOffset, actionFilter || undefined);
      setLogs(prev => [...prev, ...(auditRes.logs ?? [])]);
      setPagination(auditRes.pagination ?? pagination);
    } catch {
      // Silently fail on load more - user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [token, namespace, environment, pagination, loadingMore, actionFilter]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  if (!token) {
    return (
      <EmptyState
        icon={Shield}
        title="API token required"
        description="Audit entries are loaded from the server JSONL log."
        actionHref="/settings"
        actionLabel="Settings"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const presentedLogs = filteredIp ? logs.filter(l => l.ip_address === filteredIp) : logs;

  const items = presentedLogs.map((log, i) => ({
    id: `${log.timestamp}-${i}`,
    title: log.action,
    subtitle: [
      log.resource && `Resource: ${log.resource}`,
      log.user_id && `Actor: ${log.user_id}`,
      log.ip_address && `IP: ${log.ip_address}`,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: log.timestamp,
    variant: actionVariant(log.action),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">Audit & Access Logs</h2>
        <p className="text-sm text-zinc-500">
          Trace authentication history to corresponding operational actions in {namespace}/{environment}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Left Column: Login History / Sessions */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-violet-400" /> Global Logins
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Recent authentication sessions across your tokens. Click a session to trace their actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                {logins.length === 0 && (
                  <div className="p-4 text-center text-sm text-zinc-500">
                    <MonitorOff className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No recent logins.
                  </div>
                )}
                {logins.map((login, idx) => {
                  const isFailure = login.action === "LOGIN_FAILURE";
                  const isActiveIp = filteredIp === login.ip_address;
                  return (
                    <div
                      key={`login-${idx}`}
                      onClick={() => setFilteredIp(isActiveIp ? null : (login.ip_address || null))}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        isActiveIp
                          ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                          : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant={isFailure ? "destructive" : "secondary"} className="text-[10px] uppercase font-bold">
                          {isFailure ? "Failed" : "Success"}
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          {formatIso(login.timestamp).split(',')[0]}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {login.ip_address || "Unknown IP"}
                      </div>
                      <div className="text-xs text-zinc-400 truncate flex items-center mt-1">
                        Actor: {login.user_id}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions Timeline */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
            <div>
              <h3 className="font-semibold text-zinc-200">Action Trail</h3>
              <p className="text-xs text-zinc-400">
                {filteredIp
                  ? `Filtering timeline strictly by IP: ${filteredIp}`
                  : `Showing ${items.length} of ${pagination.total} actions across this repository.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {filteredIp && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilteredIp(null)}
                  className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
                >
                  Clear IP Filter
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Action</span>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    void loadInitial();
                  }}
                  className="h-8 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">All</option>
                  <option value="CREATE_VARIABLE">Create</option>
                  <option value="UPDATE_VARIABLE">Update</option>
                  <option value="DELETE_VARIABLE">Delete</option>
                  <option value="BULK_REPLACE">Bulk Replace</option>
                  <option value="EXPORT_VARIABLES">Export</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="LOGIN_FAILURE">Login Failure</option>
                  <option value="SESSION_CREATED">Session Created</option>
                  <option value="SESSION_REVOKED">Session Revoked</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    void loadInitial(newSize);
                  }}
                  className="h-8 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <>
              <Timeline items={items} />
              {pagination.has_more && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Load More ({pagination.total - pagination.offset - pagination.limit} remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-zinc-600">
                  Showing {pagination.offset + items.length} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newOffset = Math.max(0, pagination.offset - pagination.limit);
                      setPagination(prev => ({ ...prev, offset: newOffset }));
                      void loadInitial();
                    }}
                    disabled={pagination.offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-zinc-500 px-2">
                    Page {Math.floor(pagination.offset / pagination.limit) + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void loadMore()}
                    disabled={!pagination.has_more}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No Actions Found"
              description={filteredIp
                ? "This IP address performed no subsequent actions in this specific environment."
                : "No operational history found for this environment."}
            />
          )}
        </div>
      </div>
    </div>
  );
}