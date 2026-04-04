"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, MonitorOff, UserCheck, SearchX } from "lucide-react";
import { api, type AuditEntry } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Timeline } from "@/components/layout/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/forms/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  params: { namespace: string; environment: string };
}) {
  const { namespace, environment } = params;
  const { token } = useWorkspace();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [logins, setLogins] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredIp, setFilteredIp] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [auditRes, loginRes] = await Promise.all([
        api.audit(token, namespace, environment, 120),
        api.metaLogins(token)
      ]);
      setLogs(auditRes.logs ?? []);
      setLogins(loginRes.logins ?? []);
    } catch {
      setLogs([]);
      setLogins([]);
    } finally {
      setLoading(false);
    }
  }, [token, namespace, environment]);

  useEffect(() => {
    void load();
  }, [load]);

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
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isActiveIp 
                          ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]" 
                          : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                      }`}
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
          <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
            <div>
              <h3 className="font-semibold text-zinc-200">Action Trail</h3>
              <p className="text-xs text-zinc-400">
                {filteredIp 
                  ? `Filtering timeline strictly by IP: ${filteredIp}` 
                  : "Showing all actions across this repository."}
              </p>
            </div>
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
          </div>
          
          {items.length > 0 ? (
            <Timeline items={items} />
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
