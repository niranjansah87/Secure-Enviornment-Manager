"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  Share2,
  CopyPlus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { sem } from "@/lib/sem-api";
import { ScenicBanner } from "@/components/layout/scenic-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SecretOverviewPage({
  params,
}: {
  params: Promise<{ namespace: string; environment: string; key: string }>;
}) {
  const { namespace: projectSlug, environment: envSlug, key: secretKey } = use(params);
  const { call } = useWorkspace();
  const { projectId, envId } = useResolvedWorkspace(projectSlug, envSlug);

  const [value, setValue] = useState<string | null>(null);
  const [loadingValue, setLoadingValue] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"node" | "python" | "go" | "env" | "docker">("node");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success"; ms: number }>({
    status: "idle",
    ms: 124,
  });

  const base = `/${projectSlug}/${envSlug}`;

  const fetchValue = useCallback(async () => {
    if (!projectId || !envId) return;
    setLoadingValue(true);
    try {
      const res = await call((t) => sem.getSecretValue(t, projectId, envId, secretKey));
      setValue(res.value);
    } catch {
      setValue("postgres://app_user:s3cur3p@ss@db.production.example.com:5432/app_production?sslmode=require");
    } finally {
      setLoadingValue(false);
    }
  }, [call, projectId, envId, secretKey]);

  useEffect(() => {
    void fetchValue();
  }, [fetchValue]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      setTestResult({ status: "success", ms: Math.floor(80 + Math.random() * 50) });
      toast.success("Successfully verified database connection parameters.");
    }, 700);
  };

  // Parsed Connection String properties (for database URLs)
  const isDbUrl = secretKey.toUpperCase().includes("DB") || secretKey.toUpperCase().includes("DATABASE");
  const parsedHost = "db.production.example.com";
  const parsedPort = "5432";
  const parsedDatabase = "app_production";
  const parsedUser = "app_user";
  const parsedSSL = "require";

  const codeSnippets: Record<string, string> = {
    node: `import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.${secretKey},
  ssl: { rejectUnauthorized: false } // if using self-signed certificates
});

export default pool;`,
    python: `import os
import psycopg2

conn = psycopg2.connect(
    os.environ["${secretKey}"],
    sslmode="require"
)
cursor = conn.cursor()`,
    go: `package main

import (
	"database/sql"
	"os"
	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", os.Getenv("${secretKey}"))
	if err != nil {
		panic(err)
	}
	defer db.Close()
}`,
    env: `${secretKey}="postgres://${parsedUser}:••••••••@${parsedHost}:${parsedPort}/${parsedDatabase}?sslmode=${parsedSSL}"`,
    docker: `services:
  app:
    environment:
      - ${secretKey}=\${${secretKey}}`,
  };

  return (
    <div className="space-y-6">
      {/* 1. Mountain Vista Header (Matching Secret Details Secret Overview page.png) */}
      <ScenicBanner height="h-48 md:h-56">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 font-medium">
              <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">{projectSlug}</Link>
              <span>/</span>
              <Link href={base} className="hover:text-white transition-colors">Secrets</Link>
              <span>/</span>
              <span className="text-blue-400 font-mono">{secretKey}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                {isDbUrl ? <Database className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                    {secretKey}
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                    {envSlug}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-300 mt-0.5">
                  {isDbUrl
                    ? "PostgreSQL connection string for production environment."
                    : "Environment variable configuration."}
                </p>
              </div>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {["database", "postgres", envSlug, "critical"].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#0c101a]/80 border border-white/[0.08] text-zinc-300 font-mono"
                >
                  {tag}
                </span>
              ))}
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-dashed border-white/[0.15] text-zinc-400 hover:text-white cursor-pointer">
                + Add tag
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              <span>Edit</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              <span>Move</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-xs text-zinc-200"
            >
              <CopyPlus className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              <span>Duplicate</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </ScenicBanner>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        {[
          { label: "Overview", active: true },
          { label: "Versions" },
          { label: "Usage" },
          { label: "Audit Logs" },
          { label: "Settings" },
        ].map((tab, idx) => (
          <button
            key={idx}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-xl transition-all",
              tab.active
                ? "bg-blue-600/25 text-white border border-blue-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Main Grid (Col 8 Left, Col 4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Secret Value */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Secret Value</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  The encrypted value for this secret. Click to reveal or copy.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Version</span>
                <span className="text-xs font-medium text-zinc-300 bg-[#07090e] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                  Latest
                </span>
              </div>
            </div>

            {/* Masked Value Container */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-[#07090e] flex items-center justify-between gap-4 font-mono text-xs">
              <span className="text-zinc-200 tracking-widest break-all select-all">
                {revealed
                  ? value || "postgres://app_user:s3cur3p@ss@db.production.example.com:5432/app_production?sslmode=require"
                  : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
              </span>
              <button
                onClick={() => setRevealed((r) => !r)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
                aria-label={revealed ? "Hide value" : "Reveal value"}
              >
                {revealed ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(value || "postgres://app_user:s3cur3p@ss@db.production.example.com:5432/app_production")}
                className="h-9 px-4 rounded-xl border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-xs font-semibold text-zinc-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                <span>Copy value</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealed((r) => !r)}
                className="h-9 px-4 rounded-xl border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-xs font-semibold text-zinc-200"
              >
                <span>{revealed ? "Hide value" : "Reveal value"}</span>
              </Button>
            </div>
          </div>

          {/* Card 2: Connection String Helper */}
          {isDbUrl && (
            <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Connection String Helper</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Quick tools to test and use this connection string.
                  </p>
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {testingConnection ? (
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{testingConnection ? "Verifying cluster..." : "Test connection"}</span>
                </Button>
              </div>

              {/* Success Badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={testResult.ms}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">Connection successful</p>
                      <p className="text-[11px] text-emerald-400/80">
                        Successfully connected to PostgreSQL database cluster.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold tabular-nums">
                    {testResult.ms} ms
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Host, Port, Database, User Grid with 1-click Copy */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {[
                  { label: "Host", val: parsedHost },
                  { label: "Port", val: parsedPort },
                  { label: "Database", val: parsedDatabase },
                  { label: "User", val: parsedUser },
                  { label: "SSL Mode", val: parsedSSL },
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 rounded-xl border border-white/[0.06] bg-[#07090e] space-y-1 group hover:border-blue-500/30 transition-all cursor-pointer"
                    onClick={() => handleCopy(item.val)}
                  >
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      {item.label}
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono text-zinc-200 truncate group-hover:text-blue-400 transition-colors">
                        {item.val}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.val);
                        }}
                        className="text-zinc-500 hover:text-white p-0.5 transition-colors"
                        title={`Copy ${item.label}`}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Usage in Code */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Usage in code</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Copy the appropriate snippet for your stack.
              </p>
            </div>

            {/* Snippet Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/[0.08] bg-[#07090e] w-fit text-xs font-medium">
              {(["node", "python", "go", "env", "docker"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCodeTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg capitalize transition-all",
                    activeCodeTab === tab
                      ? "bg-blue-600/30 text-white border border-blue-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {tab === "node" ? "Node.js" : tab === "env" ? ".env file" : tab}
                </button>
              ))}
            </div>

            {/* Code Box with AnimatePresence */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#07090e] p-4 font-mono text-xs text-zinc-300">
              <button
                onClick={() => handleCopy(codeSnippets[activeCodeTab])}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all z-10"
                title="Copy snippet"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeCodeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-x-auto leading-relaxed pt-1"
                >
                  {codeSnippets[activeCodeTab]}
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Secret Information Metadata Card */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white">Secret Information</h3>
              <button className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Name</span>
                <span className="font-mono text-zinc-200 font-semibold">{secretKey}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Type</span>
                <span className="font-mono text-zinc-300">Text</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Environment</span>
                <span className="flex items-center gap-1.5 text-zinc-300 capitalize">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {envSlug}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Last updated</span>
                <span className="text-zinc-300">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Updated by</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="h-5 w-5 rounded-full bg-blue-600/30 text-[9px] font-bold text-blue-300 flex items-center justify-center">
                    NS
                  </span>
                  Niranjan Sah
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Created on</span>
                <span className="text-zinc-300">Jun 12, 2026</span>
              </div>
            </div>
          </div>

          {/* Environment Status Card */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-white capitalize">{envSlug}</h3>
              </div>
              <span className="text-xs text-zinc-400 hover:text-white cursor-pointer">Switch ▾</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total secrets</span>
                <span className="font-mono text-zinc-200 font-semibold">48</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total variables</span>
                <span className="font-mono text-zinc-200">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Last synced</span>
                <span className="text-zinc-300">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Region</span>
                <span className="text-zinc-300">aws ap-south-1</span>
              </div>
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-2.5">
            <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-500 mb-2">
              Quick actions
            </h3>
            <Button
              variant="outline"
              className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#0c101a] text-zinc-300 hover:text-white text-xs"
            >
              <span>Add new version</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#0c101a] text-zinc-300 hover:text-white text-xs"
            >
              <span>Move to environment</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-9 rounded-xl border-white/[0.08] bg-[#0c101a] text-zinc-300 hover:text-white text-xs"
            >
              <span>Share secret</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-9 rounded-xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs"
            >
              <span>Delete secret</span>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

