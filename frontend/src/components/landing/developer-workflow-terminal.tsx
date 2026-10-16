"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Check, 
  Copy, 
  RotateCcw, 
  Terminal as TerminalIcon, 
  ArrowRight
} from "lucide-react";

interface WorkflowTab {
  id: string;
  label: string;
  badge: string;
  command: string;
  description: string;
  features: string[];
  output: Array<{
    text: string;
    type: "info" | "success" | "meta" | "comment" | "header";
    delay: number;
  }>;
}

const WORKFLOW_TABS: WorkflowTab[] = [
  {
    id: "CLI",
    label: "CLI",
    badge: "sem-cli v2.4",
    command: "sem env pull main/production --format dotenv --output .env.production",
    description: "Fetch environment variables directly to .env with cryptographic signature verification.",
    features: [
      "Atomic writes with restricted 0600 file permissions",
      "In-memory AES-256-GCM envelope decryption",
      "Automatic gitignore verification to prevent leaks",
    ],
    output: [
      { text: "# Resolving tenant and cryptographic keys...", type: "comment", delay: 150 },
      { text: "[1/4] Connected to API server: https://api.sem.internal:3001", type: "info", delay: 200 },
      { text: "[2/4] Validated ECDSA session signature (tenant: core-systems)", type: "info", delay: 200 },
      { text: "[3/4] Pulling encrypted envelope 'main/production' (v4, 18 keys)", type: "info", delay: 250 },
      { text: "[4/4] Decrypting payload with AES-256-GCM in memory... done (11ms)", type: "info", delay: 200 },
      { text: "✔ Successfully written 18 secrets to .env.production (mode: 0600)", type: "success", delay: 200 },
      { text: "✔ Checksum sha256:8f2a...c041 verified against audit trail", type: "success", delay: 150 },
    ],
  },
  {
    id: "SDK",
    label: "SDK",
    badge: "@sem/sdk",
    command: "ts-node src/server.ts",
    description: "Type-safe secret injection in Node.js, Next.js, Python, and Go with automatic key rotation.",
    features: [
      "Full TypeScript autocompletion for environment keys",
      "Zero disk footprint: secrets stored only in memory",
      "Configurable background TTL caching and live reload",
    ],
    output: [
      { text: "# Initializing SEM SDK client in memory...", type: "comment", delay: 150 },
      { text: "[sem-sdk] Initialized client for project 'main' (env: 'production')", type: "info", delay: 200 },
      { text: "[sem-sdk] Fetched envelope: 18 variables loaded into process.env", type: "info", delay: 220 },
      { text: "[sem-sdk] Secret cache warm: TTL 300s, auto-refresh enabled", type: "meta", delay: 180 },
      { text: "✔ process.env.DATABASE_URL injected into connection pool", type: "success", delay: 200 },
      { text: "[server] PostgreSQL 16 connection established (pool size: 10)", type: "info", delay: 200 },
      { text: "✔ Fastify server listening on http://0.0.0.0:8080", type: "success", delay: 150 },
    ],
  },
  {
    id: "REST API",
    label: "REST API",
    badge: "OpenAPI 3.0",
    command: "curl -s -X GET \"http://localhost:3001/api/v1/projects/main/envs/production/secrets\" \\\n  -H \"Authorization: Bearer sem_live_9f8a...\" \\\n  -H \"Accept: application/json\"",
    description: "Sub-millisecond REST endpoints with Bearer token authentication and OpenAPI 3.0 specs.",
    features: [
      "Low-latency Fastify engine with sub-5ms p99 response times",
      "RBAC-scoped Bearer tokens with strict tenant isolation",
      "Full audit trail logging on every secrets read access",
    ],
    output: [
      { text: "HTTP/1.1 200 OK", type: "header", delay: 120 },
      { text: "content-type: application/json; charset=utf-8", type: "header", delay: 120 },
      { text: "x-sem-ratelimit-remaining: 994", type: "header", delay: 120 },
      { text: "{", type: "meta", delay: 150 },
      { text: '  "status": "success",', type: "meta", delay: 100 },
      { text: '  "project": "main",', type: "meta", delay: 100 },
      { text: '  "environment": "production",', type: "meta", delay: 100 },
      { text: '  "secrets_count": 18,', type: "info", delay: 120 },
      { text: '  "encryption": "AES-256-GCM",', type: "info", delay: 120 },
      { text: '  "verified": true', type: "success", delay: 120 },
      { text: "}", type: "meta", delay: 150 },
    ],
  },
  {
    id: "Remote Dotenv",
    label: "Remote Dotenv",
    badge: "zero-disk run",
    command: "sem run --project main --env production -- npm start",
    description: "Execute commands with remote decrypted secrets injected directly into subprocess memory.",
    features: [
      "Zero plaintext ever touches disk or logs",
      "No risk of accidental Git commits of credentials",
      "Seamless drop-in for Docker containers and CI/CD pipelines",
    ],
    output: [
      { text: "# Launching subprocess with memory-injected secrets...", type: "comment", delay: 150 },
      { text: "[sem] Authenticated session for acme-corp", type: "info", delay: 200 },
      { text: "[sem] Injected 18 decrypted variables into child process environment", type: "info", delay: 200 },
      { text: "[sem] Zero-disk mode: disk writes disabled for environment stream", type: "meta", delay: 180 },
      { text: "> app@2.0.0 start", type: "comment", delay: 200 },
      { text: "> next start -p 3000", type: "comment", delay: 200 },
      { text: "▲ Next.js 15.2.0 - Local: http://localhost:3000", type: "info", delay: 220 },
      { text: "✔ Ready in 610ms (18 remote variables active)", type: "success", delay: 150 },
    ],
  },
];

export function DeveloperWorkflowTerminal() {
  const [activeTabId, setActiveTabId] = useState<string>("CLI");
  const [typedCommand, setTypedCommand] = useState<string>("");
  const [visibleLogs, setVisibleLogs] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [replayKey, setReplayKey] = useState<number>(0);

  const activeTab = WORKFLOW_TABS.find((t) => t.id === activeTabId) || WORKFLOW_TABS[0];
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restart animation whenever activeTabId or replayKey changes
  useEffect(() => {
    // Clear any pending timers
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (logsTimerRef.current) clearTimeout(logsTimerRef.current);

    setTypedCommand("");
    setVisibleLogs(0);
    setIsTyping(true);
    setIsFinished(false);

    const fullCommand = activeTab.command;
    let charIndex = 0;

    const startLogStream = (index: number) => {
      if (index >= activeTab.output.length) {
        setIsFinished(true);
        return;
      }

      logsTimerRef.current = setTimeout(() => {
        setVisibleLogs(index + 1);
        startLogStream(index + 1);
      }, activeTab.output[index].delay);
    };

    const typeNextChar = () => {
      if (charIndex < fullCommand.length) {
        setTypedCommand(fullCommand.slice(0, charIndex + 1));
        charIndex++;
        // Natural typewriter cadence
        const delay = fullCommand[charIndex - 1] === "\n" ? 180 : Math.random() * 20 + 25;
        typingTimerRef.current = setTimeout(typeNextChar, delay);
      } else {
        setIsTyping(false);
        // Start streaming output logs
        startLogStream(0);
      }
    };

    // Initial slight pause before typing starts
    typingTimerRef.current = setTimeout(typeNextChar, 180);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (logsTimerRef.current) clearTimeout(logsTimerRef.current);
    };
  }, [activeTab, replayKey]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  return (
    <section className="py-24 border-t border-white/[0.08] relative bg-[#07090e]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Developer Story & Interactive Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 font-mono text-[11px] uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                BUILT FOR DEVELOPERS
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
                Integrates with your workflow
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Access your environment variables from anywhere — web UI, CLI, SDK, or directly via REST API.
              </p>
            </div>

            {/* Tabs Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-white/[0.08] bg-[#0c101a] w-fit">
              {WORKFLOW_TABS.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-blue-600/30 text-white border border-blue-500/40 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Workflow Description Card */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  {activeTab.label} Integration
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                  {activeTab.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {activeTab.description}
              </p>
              <div className="space-y-1.5 pt-1 border-t border-white/[0.05]">
                {activeTab.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Links */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href="https://github.com/niranjansah87/Secure-Enviornment-Manager#cli-guide"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-zinc-200 text-xs font-semibold transition-all"
              >
                <span>View documentation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleReplay}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 text-xs transition-all"
                title="Replay terminal animation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
            </div>
          </div>

          {/* Right Column: Authentic Animated Developer Terminal */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-white/[0.12] bg-[#0b0e14] shadow-2xl overflow-hidden">
              
              {/* macOS / Linux Terminal Window Header */}
              <div className="px-4 py-3 bg-[#0e121b] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444]/90 hover:opacity-80 transition-opacity cursor-pointer inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b]/90 hover:opacity-80 transition-opacity cursor-pointer inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#10b981]/90 hover:opacity-80 transition-opacity cursor-pointer inline-block" />
                  </div>
                  <div className="h-4 w-[1px] bg-white/[0.1] mx-1" />
                  <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-mono">
                    <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-zinc-300">zsh</span>
                    <span className="text-zinc-600">—</span>
                    <span className="text-zinc-400">~/projects/core-billing</span>
                    <span className="text-blue-400/80 text-[11px]">(main)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06]">
                    UTF-8
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
                    title="Copy command"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReplay}
                    className="p-1 rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
                    title="Rerun command in terminal"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Terminal Screen Body */}
              <div className="p-5 font-mono text-[12.5px] leading-relaxed text-zinc-300 min-h-[360px] md:min-h-[400px] flex flex-col justify-between overflow-x-auto bg-[#090c12]">
                <div className="space-y-2">
                  
                  {/* System intro header */}
                  <div className="text-[11px] text-zinc-500 select-none pb-1">
                    Last login: Fri Oct 16 17:50:00 on ttys004
                  </div>

                  {/* Command prompt & typed input */}
                  <div className="flex items-start gap-2 text-zinc-100 flex-wrap">
                    <span className="text-emerald-400 font-semibold select-none">
                      developer@workstation:~/billing
                    </span>
                    <span className="text-zinc-500 select-none">$</span>
                    <span className="text-blue-300 font-semibold whitespace-pre-wrap break-all">
                      {typedCommand}
                    </span>
                    {isTyping && (
                      <span className="inline-block w-2 h-4 bg-blue-400 translate-y-0.5 animate-pulse" />
                    )}
                  </div>

                  {/* Output logs rendered step by step */}
                  <div className="space-y-1.5 pt-2">
                    {activeTab.output.slice(0, visibleLogs).map((log, idx) => {
                      let colorClass = "text-zinc-400";
                      if (log.type === "success") colorClass = "text-emerald-400 font-medium";
                      if (log.type === "info") colorClass = "text-zinc-300";
                      if (log.type === "comment") colorClass = "text-zinc-500";
                      if (log.type === "meta") colorClass = "text-zinc-400";
                      if (log.type === "header") colorClass = "text-amber-300/90 font-mono";

                      return (
                        <div
                          key={idx}
                          className={`${colorClass} transition-opacity duration-150 animate-in fade-in flex items-start gap-2`}
                        >
                          <span className="whitespace-pre-wrap break-all">{log.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Idle prompt after execution finishes */}
                  {isFinished && (
                    <div className="flex items-center gap-2 text-zinc-100 pt-2 animate-in fade-in">
                      <span className="text-emerald-400 font-semibold select-none">
                        developer@workstation:~/billing
                      </span>
                      <span className="text-zinc-500 select-none">$</span>
                      <span className="inline-block w-2 h-4 bg-zinc-400 translate-y-0.5 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Terminal status bar */}
                <div className="pt-4 mt-6 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500 select-none">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isFinished ? "bg-emerald-400" : "bg-blue-400 animate-pulse"}`} />
                      <span>{isFinished ? "Execution completed (exit 0)" : isTyping ? "Typing..." : "Running process..."}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>18 secrets verified</span>
                    <span>AES-256-GCM</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default DeveloperWorkflowTerminal;
