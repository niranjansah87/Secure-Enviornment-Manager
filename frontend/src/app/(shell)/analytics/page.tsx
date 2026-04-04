"use client";

import { useEffect, useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  Cpu, 
  TrendingUp,
  PieChart as PieIcon,
  Zap,
  Lock,
  AlertTriangle,
  LucideIcon
} from "lucide-react";
import { api, type AnalyticsResponse, type HealthResponse } from "@/lib/api";
import { useWorkspace } from "@/context/workspace-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const { token } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    
    let cancelled = false;
    setLoading(true);
    
    Promise.all([
      api.metaAnalytics(token, 7),
      api.metaHealth(token).catch(() => null) // Health might fail if not master/dashboard
    ]).then(([analytics, healthData]) => {
      if (cancelled) return;
      setData(analytics);
      setHealth(healthData);
    }).catch(e => {
      console.error("Failed to load analytics data", e);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [token]);

  if (!token) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-zinc-800">
        <p className="text-zinc-500">Please connect your API token to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Analytics & Health</h1>
        <p className="text-zinc-500">Real-time system monitoring and activity trends.</p>
      </div>

      {/* Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <HealthCard 
              title="System Status" 
              status={health?.status || "unknown"} 
              message={health?.status === "healthy" ? "All systems optimal" : "System degraded"}
              icon={ShieldCheck} 
            />
            <HealthCard 
              title="Encryption" 
              status={health?.checks.encryption.status || "ok"} 
              message={health?.checks.encryption.message || "Key verified"}
              icon={Activity} 
            />
            <HealthCard 
              title="Storage" 
              status={health?.checks.storage.status || "ok"} 
              message={health?.checks.storage.message || "Space efficient"}
              icon={HardDrive} 
            />
            <HealthCard 
              title="Performance" 
              status="ok" 
              message={`RAM: ${health?.checks.process.details?.memory_mb || 0}MB`}
              icon={Cpu} 
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Trend */}
        <Card className="col-span-2 border-zinc-800 bg-[#111827]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              <CardTitle>Activity Trend (7 Days)</CardTitle>
            </div>
            <CardDescription>Aggregate events across your accessible namespaces.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trends}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val: string) => val.split("-").slice(1).join("/")}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    labelStyle={{ color: "#f8fafc", fontWeight: "bold", marginBottom: "4px" }}
                    itemStyle={{ color: "#94a3b8", fontSize: "12px" }}
                    cursor={{ stroke: '#4c1d95', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="updates" 
                    stroke="#3b82f6" 
                    fill="transparent" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Security Health */}
        <Card className="border-zinc-800 bg-[#111827]">
          <CardHeader>
            <div className="flex items-center gap-2">
              {data && data.security_stats.failures > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
              ) : (
                <Lock className="h-5 w-5 text-emerald-400" />
              )}
              <CardTitle>Security Health</CardTitle>
            </div>
            <CardDescription>Login success vs. failure ratio</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[350px] pt-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : data ? (
              <div className="w-full space-y-8">
                <div className="relative flex items-center justify-center h-40">
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-zinc-100">
                        {data.security_stats.success + data.security_stats.failures === 0 ? "100" : 
                          Math.round((data.security_stats.success / (data.security_stats.success + data.security_stats.failures)) * 100)}%
                      </span>
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">Score</span>
                   </div>
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Success', value: data.security_stats.success || 1 },
                          { name: 'Failures', value: data.security_stats.failures }
                        ]}
                        innerRadius={65}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <p className="text-[10px] uppercase text-emerald-500/60 font-semibold mb-1">Success</p>
                    <p className="text-xl font-bold text-emerald-500">{data.security_stats.success}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
                    <p className="text-[10px] uppercase text-red-500/60 font-semibold mb-1">Failures</p>
                    <p className="text-xl font-bold text-red-500">{data.security_stats.failures}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No security data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Breakdown */}
        <Card className="border-zinc-800 bg-[#111827]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <CardTitle>Event Breakdown (7 Days)</CardTitle>
            </div>
            <CardDescription>Operation types across entire system</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.action_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="action" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                    itemStyle={{ color: "#94a3b8" }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No event data</div>
            )}
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card className="border-zinc-800 bg-[#111827]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-blue-400" />
              <CardTitle>Namespace Distribution</CardTitle>
            </div>
            <CardDescription>Secrets per namespace (Estimated)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : data?.distribution.namespaces.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribution.namespaces}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="estimated_secrets"
                    nameKey="name"
                  >
                    {data.distribution.namespaces.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#111827" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                    labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                    itemStyle={{ color: "#94a3b8" }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                 <div className="flex h-full items-center justify-center text-zinc-500">No namespaces found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface HealthCardProps {
  title: string;
  status: string;
  message: string;
  icon: LucideIcon;
}

function HealthCard({ title, status, message, icon: Icon }: HealthCardProps) {
  const isOk = status === "healthy" || status === "ok";
  const isWarning = status === "warning" || status === "degraded";
  
  const getVariant = (): "success" | "warning" | "destructive" => {
    if (isOk) return "success";
    if (isWarning) return "warning";
    return "destructive";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-zinc-800 bg-[#111827]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Icon className={`h-5 w-5 ${isOk ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-red-400"}`} />
            <Badge variant={getVariant()} className="text-[10px] uppercase">
              {status}
            </Badge>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{message}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
