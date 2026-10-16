"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Terminal,
  Check,
  Copy,
  Boxes,
} from "lucide-react";
import {
  SiDocker,
  SiKubernetes,
  SiVercel,
  SiGithub,
  SiGitlab,
  SiTerraform,
  SiPython,
  SiNodedotjs,
  SiGo,
  SiGooglecloud,
  SiCloudflare,
} from "react-icons/si";
import { FaAws } from "react-icons/fa6";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Integrations3DAnimation from "@/components/animations/integrations-3d";

interface IntegrationItem {
  id: string;
  name: string;
  category: "Cloud" | "CI/CD & DevOps" | "Languages & SDKs" | "Databases";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  desc: string;
  snippet: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "docker",
    name: "Docker",
    category: "CI/CD & DevOps",
    icon: SiDocker,
    color: "text-[#2496ED]",
    desc: "Inject runtime environment variables into Docker containers dynamically at startup without baking secrets into images.",
    snippet: `ENTRYPOINT ["sem", "run", "--project", "api", "--env", "prod", "--", "node", "server.js"]`,
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    category: "Cloud",
    icon: SiKubernetes,
    color: "text-[#326CE5]",
    desc: "Sync secrets directly into native Kubernetes Secret objects or use the SEM Sidecar Injector for memory-only mounts.",
    snippet: `apiVersion: sem.io/v1alpha1
kind: SecretSync
metadata:
  name: payment-secrets
spec:
  project: core-payments
  env: production`,
  },
  {
    id: "aws",
    name: "AWS",
    category: "Cloud",
    icon: FaAws,
    color: "text-[#FF9900]",
    desc: "Delegate master KMS keys to AWS KMS or synchronize with ECS tasks, AWS Lambda functions, and EKS clusters.",
    snippet: `sem integrations sync aws-secrets-manager \\
  --region us-east-1 \\
  --prefix /sem/prod/`,
  },
  {
    id: "gcp",
    name: "Google Cloud",
    category: "Cloud",
    icon: SiGooglecloud,
    color: "text-[#4285F4]",
    desc: "Native integration with GCP Secret Manager, Cloud Run, and GKE with Workload Identity federation.",
    snippet: `gcloud run deploy payments-api \\
  --image gcr.io/my-org/api \\
  --update-env-vars SEM_PROJECT=payments,SEM_ENV=prod`,
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers",
    category: "Cloud",
    icon: SiCloudflare,
    color: "text-[#F38020]",
    desc: "Inject secrets directly into Cloudflare Workers and Pages edge runtimes with zero cold-start delay.",
    snippet: `wrangler secret:bulk <(sem env export payments/prod --format json)`,
  },
  {
    id: "terraform",
    name: "Terraform",
    category: "CI/CD & DevOps",
    icon: SiTerraform,
    color: "text-[#844FBA]",
    desc: "Official Terraform Provider for declarative management of projects, environments, and RBAC policies as code.",
    snippet: `resource "sem_secret" "db_url" {
  project     = "backend"
  environment = "production"
  key         = "DATABASE_URL"
  value       = var.db_connection
}`,
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    category: "CI/CD & DevOps",
    icon: SiGithub,
    color: "text-white",
    desc: "Action step to securely pull secrets in your build pipelines without storing stale credentials in repository settings.",
    snippet: `- name: Pull Secrets
  uses: sem-sec/sem-action@v2
  with:
    project: payments
    env: staging
    token: \${{ secrets.SEM_CI_TOKEN }}`,
  },
  {
    id: "gitlab",
    name: "GitLab CI",
    category: "CI/CD & DevOps",
    icon: SiGitlab,
    color: "text-[#FC6D26]",
    desc: "Native CLI integration inside GitLab pipelines to inject environment configs into test runners.",
    snippet: `test:
  image: node:20
  script:
    - sem run --project web --env test -- npm test`,
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Cloud",
    icon: SiVercel,
    color: "text-white",
    desc: "Bidirectional sync: push environment configurations to Vercel preview and production deployments automatically.",
    snippet: `sem integrations sync vercel \\
  --project-id prj_1234 \\
  --target production`,
  },
  {
    id: "python",
    name: "Python SDK",
    category: "Languages & SDKs",
    icon: SiPython,
    color: "text-[#3776AB]",
    desc: "Type-safe Python package supporting synchronous and async (asyncio) secret resolution with automatic caching.",
    snippet: `from sem import SEMClient

sem = SEMClient(api_key="sem_live_...")
secrets = sem.get_secrets("payments", "prod")`,
  },
  {
    id: "nodejs",
    name: "Node.js & TypeScript",
    category: "Languages & SDKs",
    icon: SiNodedotjs,
    color: "text-[#5FA04E]",
    desc: "First-class NPM SDK with full TypeScript autocomplete, fallback caching, and automatic TLS key validation.",
    snippet: `import { SEMClient } from "@sem/sdk";

const sem = new SEMClient();
const { DATABASE_URL } = await sem.secrets("payments", "prod");`,
  },
  {
    id: "go",
    name: "Go SDK",
    category: "Languages & SDKs",
    icon: SiGo,
    color: "text-[#00ADD8]",
    desc: "High-performance, zero-dependency Go client library designed for cloud-native microservices.",
    snippet: `client := sem.NewClient(os.Getenv("SEM_API_KEY"))
secrets, err := client.Get("payments", "prod")`,
  },
];

const CATEGORIES = ["All", "Cloud", "CI/CD & DevOps", "Languages & SDKs"] as const;

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<IntegrationItem>(INTEGRATIONS[0]);
  const [copied, setCopied] = useState(false);

  const filtered = INTEGRATIONS.filter((item) => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedItem.snippet);
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
                  Ecosystem & Connectors
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Connects With Your <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  Entire Cloud Stack
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Whether deploying on Kubernetes, running serverless functions on AWS, or executing CI/CD
                in GitHub Actions, SEM fits directly into your existing infrastructure without changing how
                your team writes code.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
                >
                  <span>Explore Developer Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wide transition-all"
                >
                  View SDK Documentation
                </Link>
              </div>
            </motion.div>

            {/* 3D WebGL Ecosystem Hub Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[480px] aspect-square relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent p-1 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <Integrations3DAnimation />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-400" />
                    <span>Active Hub Nodes</span>
                  </div>
                  <span className="font-mono text-blue-400">20+ CONNECTORS</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filter Controls & Search */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filtered.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedItem.id === item.id;
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-950/20 border-blue-500/40 shadow-[0_10px_30px_rgba(59,130,246,0.15)]"
                      : "bg-[#0c101a]/80 hover:bg-[#0f1422] border-white/[0.08]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-medium text-blue-400">
                    <span>Inspect Setup Snippet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Selected Integration Snippet Modal/Section */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c101a] p-8 lg:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400">
                  <Terminal className="w-4 h-4" />
                  <span>CONFIGURATION SPEC: {selectedItem.name}</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Quick Start Snippet
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Integrate {selectedItem.name} in under 2 minutes. All configurations support automated
                  health checks, secret rotation events, and atomic rollbacks.
                </p>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/[0.1] bg-[#06080d] overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                    <span className="text-[11px] font-mono text-zinc-500">{selectedItem.name.toLowerCase()}-config</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{selectedItem.snippet}</code>
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

