"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FolderOpen,
  Layers,
  Lock,
  Boxes,
  ArrowRight,
  Check,
  Copy,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Workflow3DAnimation from "@/components/animations/workflow-3d";

const STAGES = [
  {
    step: "01",
    id: "devs",
    title: "Developers & Identity",
    subtitle: "Scoped Access & RBAC",
    icon: Users,
    desc: "Developers authenticate via modern WebAuthn, OAuth, or granular API tokens. Each user receives deterministic role permissions scoped strictly to namespaces and environments.",
    command: "sem auth login --workspace acme-corp",
    terminalOutput: "✓ Authenticated as alex@acme.corp [Role: Senior Developer]\n✓ Active namespace session: core-banking (3 environments accessible)",
    benefits: ["Zero root credential sharing", "Auto-revocation on offboarding", "Scoped personal tokens"],
  },
  {
    step: "02",
    id: "projects",
    title: "Projects & Namespaces",
    subtitle: "Multi-Tenant Isolation",
    icon: FolderOpen,
    desc: "Secrets are logically segregated into isolated namespaces. Microservices, backend services, and frontends maintain distinct boundaries with no cross-leak risk.",
    command: "sem project create payments-service --owner backend-team",
    terminalOutput: "✓ Project 'payments-service' provisioned\n✓ Tenant isolation enforced via PostgreSQL Row-Level Security (RLS)\n✓ Initialized master key derivation tree",
    benefits: ["Strict PostgreSQL tenant RLS", "Isolated access matrices", "Per-project audit trails"],
  },
  {
    step: "03",
    id: "environments",
    title: "Tiered Environments",
    subtitle: "Dev, Staging & Production",
    icon: Layers,
    desc: "Seamlessly promote secrets across deployment stages. Configure inheritance models where local development inherits defaults while production requires elevated approvals.",
    command: "sem env diff payments-service/staging payments-service/production",
    terminalOutput: "Comparing environments...\n[MATCH]   PORT=8080\n[MATCH]   LOG_LEVEL=info\n[DRIFT]   DATABASE_URL (Staging: rds.staging.internal | Prod: aurora.prod.internal)\n[MISSING] STRIPE_WEBHOOK_SECRET (missing in production)",
    benefits: ["Visual drift detection", "Zero copy-paste promotion", "Ephemeral preview environments"],
  },
  {
    step: "04",
    id: "vault",
    title: "Encrypted Vault Storage",
    subtitle: "Fernet AES-256 + HMAC-SHA256",
    icon: Lock,
    desc: "Before any record touches disk, our cryptographic engine encrypts values using authenticated Fernet AES-256-CBC. Integrity checksums guarantee zero ciphertext tampering.",
    command: "sem secret set DATABASE_URL postgres://... --project payments-service --env prod",
    terminalOutput: "✓ Plaintext encrypted with KMS primary key\n✓ Fernet token generated: gAAAAABl_9v8Z... (AES-256-CBC + HMAC-SHA256)\n✓ Snapshot #42 created. Merkle chain head updated.",
    benefits: ["Encrypted at rest & transit", "Tamper-evident Merkle hash", "Self-hosted key ownership"],
  },
  {
    step: "05",
    id: "injection",
    title: "In-Memory Runtime Injection",
    subtitle: "Zero Plaintext on Disk",
    icon: Boxes,
    desc: "During container boot or local startup, secrets are retrieved through authenticated TLS and injected straight into memory. No unencrypted .env files stored on disks.",
    command: "sem run --project payments-service --env prod -- node server.js",
    terminalOutput: "✓ Resolving 24 secrets for payments-service/production...\n✓ Memory payload prepared (1.4ms)\n✓ Process spawned [PID: 49201]\n[PAYMENTS-SRV] Server listening on :8080. All secrets injected.",
    benefits: ["Never write .env to disk", "No accidental git commits", "Sub-second startup injection"],
  },
];

export default function WorkflowPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = STAGES[activeStep];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 pt-28 pb-20">
        {/* Hero Section */}
        <section className="relative px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[480px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold">
                  Continuous Secret Lifecycle
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                How Secrets Flow From <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  Developer to Cloud Runtime
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                A seamless 5-stage pipeline removing the vulnerability of static credentials. Step through
                the complete end-to-end journey from initial authorization to live memory injection.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
                >
                  <span>Experience Pipeline in Action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/security"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wide transition-all"
                >
                  Inspect Cryptographic Model
                </Link>
              </div>
            </motion.div>

            {/* 3D Animated Pipeline Simulation Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[480px] aspect-square relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent p-1 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <Workflow3DAnimation />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span>Conduit Stream Active</span>
                  </div>
                  <span className="font-mono text-emerald-400">LATENCY: 0.8ms</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Interactive 5-Step Pipeline Stepper */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
          {/* Step Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-12">
            {STAGES.map((st, idx) => {
              const Icon = st.icon;
              const isCurrent = activeStep === idx;
              return (
                <button
                  key={st.id}
                  onClick={() => setActiveStep(idx)}
                  className={`relative p-3.5 rounded-xl text-left transition-all flex flex-col justify-between ${
                    isCurrent
                      ? "bg-blue-600/20 border border-blue-500/40 text-white shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                      : "bg-[#0c101a]/40 border border-transparent hover:border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[10px] font-mono font-bold text-blue-400">STEP {st.step}</span>
                    <Icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="text-xs font-bold truncate">{st.title}</span>
                </button>
              );
            })}
          </div>

          {/* Detailed Stage Workspace */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-white/[0.08] bg-[#0c101a] p-8 lg:p-12 shadow-2xl relative overflow-hidden"
            >
              {/* Left Column: Stage Explanation */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-blue-400">
                  <span>STAGE {current.step} OF 05</span>
                  <span>&bull;</span>
                  <span>{current.subtitle}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {current.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {current.desc}
                </p>

                <div className="space-y-2.5 pt-2">
                  {current.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                      <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : STAGES.length - 1))}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setActiveStep((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0))}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <span>Next Stage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Live Interactive CLI & Terminal Output */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/[0.1] bg-[#06080d] overflow-hidden shadow-2xl">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      <span className="text-[11px] font-mono text-zinc-500 ml-2">sem-cli terminal</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy command"}</span>
                    </button>
                  </div>

                  {/* Terminal Content */}
                  <div className="p-6 font-mono text-xs space-y-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="text-blue-400 select-none">$</span>
                      <span className="text-white font-medium">{current.command}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04] text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                      {current.terminalOutput}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

