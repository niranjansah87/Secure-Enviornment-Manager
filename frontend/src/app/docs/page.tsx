"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Terminal,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Docs3DAnimation from "@/components/animations/docs-3d";

interface DocTopic {
  id: string;
  category: string;
  title: string;
  desc: string;
  code: string;
}

const DOC_TOPICS: DocTopic[] = [
  {
    id: "quickstart",
    category: "Getting Started",
    title: "1. Quick Start Installation",
    desc: "Install the SEM CLI toolchain via Homebrew, npm, or direct binary download. Authenticate with your organization workspace in seconds.",
    code: `# Install via NPM globally or use npx
npm install -g @sem/cli

# Or curl direct binary
curl -fsSL https://sem.sh/install | sh

# Authenticate with your cluster
sem login --url https://vault.yourcompany.com`,
  },
  {
    id: "create-project",
    category: "Projects",
    title: "2. Projects & Namespaces",
    desc: "Provision a new project namespace and attach production, staging, and development environments.",
    code: `# Create a new isolated project namespace
sem project create core-billing --description "Billing & Stripe integration"

# List configured environments
sem env list --project core-billing`,
  },
  {
    id: "push-secrets",
    category: "Secrets",
    title: "3. Set & Pull Encrypted Secrets",
    desc: "Add encrypted environment variables directly from command line or import bulk .env files.",
    code: `# Set a single encrypted variable
sem secret set STRIPE_SECRET_KEY sk_live_51... \\
  --project core-billing \\
  --env production

# Import from existing .env.production file
sem env push .env.production \\
  --project core-billing \\
  --env production`,
  },
  {
    id: "runtime-inject",
    category: "Runtime",
    title: "4. Memory Injection & Remote Dotenv",
    desc: "Execute your local or production process with environment variables injected straight into process memory.",
    code: `# Launch your application without writing .env to disk
sem run --project core-billing --env production -- npm start

# Or export ephemeral dotenv to stdout for piping
sem env pull core-billing/production --format dotenv`,
  },
  {
    id: "sdk-usage",
    category: "SDK Reference",
    title: "5. Programmatic SDK Usage",
    desc: "Connect dynamically within Node.js, Python, or Go microservices using the official client libraries.",
    code: `import { SEMClient } from "@sem/sdk";

const sem = new SEMClient({
  endpoint: process.env.SEM_HOST,
  token: process.env.SEM_TOKEN,
});

// Secrets are cached in memory with automatic background TTL rotation
const env = await sem.secrets.get("core-billing", "production");
console.log("DB URL:", env.DATABASE_URL);`,
  },
];

export default function DocsPage() {
  const [activeTopic, setActiveTopic] = useState<DocTopic>(DOC_TOPICS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTopic.code);
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
                  Developer Documentation & Guides
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Developer First. <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  Zero Ceremony.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Comprehensive documentation, API references, CLI tool guides, and SDK examples to get your
                teams started in minutes.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager#documentation"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
                >
                  <span>Open GitHub Documentation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link
                  href="/features"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wide transition-all"
                >
                  Explore Features
                </Link>
              </div>
            </motion.div>

            {/* 3D Developer Terminal Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[480px] aspect-square relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent p-1 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <Docs3DAnimation />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span>CLI Toolchain Ready</span>
                  </div>
                  <span className="font-mono text-emerald-400">v1.4.0 STABLE</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Documentation Interactive Split View */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Guide Topics */}
            <div className="lg:col-span-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-3">
                Quick Guide Directory
              </span>
              {DOC_TOPICS.map((topic) => {
                const isActive = activeTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopic(topic)}
                    className={`w-full text-left p-4 rounded-xl transition-all border flex items-center justify-between ${
                      isActive
                        ? "bg-blue-600/15 border-blue-500/40 text-white shadow-lg shadow-blue-500/10"
                        : "bg-[#0c101a] border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block mb-1">
                        {topic.category}
                      </span>
                      <span className="text-xs font-bold text-white block">{topic.title}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-zinc-600"}`} />
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Code Reader */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl border border-white/[0.08] bg-[#0c101a] p-8 space-y-6 shadow-2xl">
                <div>
                  <span className="text-[11px] font-mono text-blue-400 uppercase tracking-widest block mb-2">
                    {activeTopic.category}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
                    {activeTopic.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {activeTopic.desc}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.1] bg-[#06080d] overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                    <span className="text-[11px] font-mono text-zinc-500">terminal & code sample</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    <code>{activeTopic.code}</code>
                  </pre>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/[0.05] text-xs">
                  <span className="text-zinc-500">Need deep API specs or schema definitions?</span>
                  <a
                    href="https://github.com/niranjansah87/Secure-Enviornment-Manager#documentation"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <span>Full GitHub Readme</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
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

