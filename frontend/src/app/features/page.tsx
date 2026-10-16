"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  History,
  GitCompare,
  Users,
  Layers,
  Lock,
  ArrowRight,
  Check,
  Copy,
  Terminal,
  Activity,
  Fingerprint,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Features3DAnimation from "@/components/animations/features-3d";

const FEATURE_MODULES = [
  {
    id: "encryption",
    badge: "Cryptographic Core",
    icon: Lock,
    title: "Zero-Knowledge AES-256 Vault",
    desc: "Every secret is encrypted client-side or at the gateway boundary using authenticated Fernet (AES-128-CBC + HMAC-SHA256) before ever being persisted. Even database administrators see only random bytes.",
    stats: "256-bit CBC + HMAC",
    accent: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "versioning",
    badge: "Version Engine",
    icon: History,
    title: "Point-in-Time Secret Replay",
    desc: "Every edit, rotation, and revocation creates an immutable cryptographic snapshot. Roll back unintended overwrites instantly with one click or execute time-travel diffing across deployments.",
    stats: "Instant Rollback",
    accent: "from-indigo-500/20 to-purple-500/10",
    border: "border-indigo-500/30",
  },
  {
    id: "environments",
    badge: "Multi-Tiered",
    icon: Layers,
    title: "Environment Hierarchies",
    desc: "Organize variables into granular namespaces: Production, Staging, Development, and Ephemeral PR branches. Inherit base values automatically without copy-paste vulnerabilities.",
    stats: "Infinite Branching",
    accent: "from-cyan-500/20 to-blue-500/10",
    border: "border-cyan-500/30",
  },
  {
    id: "rbac",
    badge: "Access Control",
    icon: Users,
    title: "Role-Based Entitlements",
    desc: "Strict principle of least privilege. Grant developers read-only access to staging while locking production secrets to automated CI/CD runners and signed releases.",
    stats: "Per-Key ACLs",
    accent: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "diffing",
    badge: "Audit & Diff",
    icon: GitCompare,
    title: "Visual Environment Comparison",
    desc: "Never debug 'it worked in staging' again. Side-by-side variable comparison reveals missing keys, divergent endpoints, and schema drift before you hit deploy.",
    stats: "Sub-Second Diff",
    accent: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/30",
  },
  {
    id: "sdk",
    badge: "Developer Ergonomics",
    icon: Terminal,
    title: "CLI & Remote Dotenv Injection",
    desc: "Run `sem run --project main --env prod -- npm start` to inject encrypted values directly into memory. Zero disk persistence, zero git leaks, zero unencrypted `.env` files.",
    stats: "Zero-Disk Leak",
    accent: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30",
  },
];

export default function FeaturesPage() {
  const [selectedModule, setSelectedModule] = useState(FEATURE_MODULES[0]);
  const [copied, setCopied] = useState(false);

  const sampleSnippet = `// Production runtime injection with @sem/sdk
import { SEMClient } from "@sem/sdk";

const client = new SEMClient({
  endpoint: "https://vault.internal.net",
  token: process.env.SEM_APP_TOKEN,
});

// Decrypts in memory only:
const config = await client.secrets.resolve({
  project: "core-payments",
  environment: "production",
});

export const STRIPE_KEY = config.STRIPE_SECRET_KEY;`;

  const copyCode = () => {
    navigator.clipboard.writeText(sampleSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 pt-28 pb-20">
        {/* Hero Section with 3D Core */}
        <section className="relative px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[500px]">
            {/* Left Header Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold">
                  Enterprise Feature Suite
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Engineered for <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  Zero Trust & Total Velocity
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Explore the complete technical anatomy of Secure Environment Manager: authenticated
                encryption at rest, immutable point-in-time state trees, granular workspace tenancy, and
                frictionless runtime secret delivery.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
                >
                  <span>Launch Interactive Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wide transition-all"
                >
                  Read Architecture Spec
                </Link>
              </div>
            </motion.div>

            {/* Right 3D Interactive Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[480px] aspect-square relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent p-1 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <Features3DAnimation />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-blue-400" />
                    <span>Live Crystal Telemetry</span>
                  </div>
                  <span className="font-mono text-blue-400">STATE: SYNCHRONIZED</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 6 Core Feature Grid with 3D Hover & Live Preview */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Architectural Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Purpose-built primitives replacing dangerous plaintext `.env` configurations across your
              entire organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isSelected = selectedModule.id === mod.id;
              return (
                <motion.div
                  key={mod.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => setSelectedModule(mod)}
                  className={`cursor-pointer rounded-2xl p-6 transition-all border relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? `bg-gradient-to-b ${mod.accent} ${mod.border} shadow-[0_15px_35px_rgba(59,130,246,0.15)]`
                      : "bg-[#0c101a]/80 hover:bg-[#0f1422] border-white/[0.08]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                        {mod.stats}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2">{mod.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{mod.desc}</p>
                  </div>

                  <div className="pt-6 mt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-medium">
                    <span className="text-blue-400">{mod.badge}</span>
                    <span className="text-zinc-500 group-hover:text-white flex items-center gap-1">
                      Inspect Spec <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Live Interactive Spec Inspection Terminal */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-24">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c101a] p-8 lg:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400">
                  <Activity className="w-4 h-4" />
                  <span>DEEP DIVE: {selectedModule.title}</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Developer First Interface
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Every feature has full programmatic parity across our HTTP REST API, CLI binary, and
                  typed Node/Python SDK. Inject values securely without ever checking API secrets into
                  Git.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Automated key rotation with atomic cutover</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>End-to-end payload signature verification</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Real-time webhook notifications on tamper</span>
                  </div>
                </div>
              </div>

              {/* Code terminal preview */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/[0.1] bg-[#06080d] overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      <span className="text-[11px] font-mono text-zinc-500 ml-2">runtime-injection.ts</span>
                    </div>
                    <button
                      onClick={copyCode}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{sampleSnippet}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

