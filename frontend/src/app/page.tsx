"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Users,
  Layers,
  Boxes,
  Copy,
  Check,
  Compass,
  FolderOpen,
  KeyRound,
  History,
  GitCompare,
  BarChart3,
  ChevronRight,
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
  SiPostgresql,
  SiMongodb,
  SiRedis,
  SiFastapi,
  SiDjango,
  SiTailwindcss,
  SiReact,
  SiNextdotjs,
  SiGooglecloud,
  SiCloudflare,
} from "react-icons/si";
import { FaAws, FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { FiMail } from "react-icons/fi";
import { useWorkspace } from "@/context/workspace-context";
import { useEffect } from "react";
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const PIPELINE_STAGES = [
  {
    icon: Users,
    title: "Developers",
    desc: "Give the right access to the right people.",
  },
  {
    icon: FolderOpen,
    title: "Projects",
    desc: "Organize your work into namespaces.",
  },
  {
    icon: Layers,
    title: "Environments",
    desc: "Manage dev, staging, production and more.",
  },
  {
    icon: Lock,
    title: "Encrypted secrets",
    desc: "Stored securely on your infrastructure.",
  },
  {
    icon: Boxes,
    title: "Applications",
    desc: "Sync to your apps via API, CLI or SDK.",
  },
];

const STACK_ROW_1 = [
  { name: "Docker", icon: SiDocker, color: "text-[#2496ED]" },
  { name: "Kubernetes", icon: SiKubernetes, color: "text-[#326CE5]" },
  { name: "AWS", icon: FaAws, color: "text-[#FF9900]" },
  { name: "Google Cloud", icon: SiGooglecloud, color: "text-[#4285F4]" },
  { name: "Cloudflare", icon: SiCloudflare, color: "text-[#F38020]" },
  { name: "Terraform", icon: SiTerraform, color: "text-[#844FBA]" },
  { name: "GitHub Actions", icon: SiGithub, color: "text-[#f0f6fc]" },
  { name: "GitLab CI", icon: SiGitlab, color: "text-[#FC6D26]" },
  { name: "Vercel", icon: SiVercel, color: "text-white" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "text-[#4169E1]" },
];

const STACK_ROW_2 = [
  { name: "Python", icon: SiPython, color: "text-[#3776AB]" },
  { name: "FastAPI", icon: SiFastapi, color: "text-[#009688]" },
  { name: "Django", icon: SiDjango, color: "text-[#092E20]" },
  { name: "Node.js", icon: SiNodedotjs, color: "text-[#5FA04E]" },
  { name: "Go", icon: SiGo, color: "text-[#00ADD8]" },
  { name: "Redis", icon: SiRedis, color: "text-[#DC382D]" },
  { name: "MongoDB", icon: SiMongodb, color: "text-[#47A248]" },
  { name: "Next.js", icon: SiNextdotjs, color: "text-white" },
  { name: "React", icon: SiReact, color: "text-[#61DAFB]" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "text-[#06B6D4]" },
];

const CODE_EXAMPLES: Record<string, string> = {
  CLI: `# Fetch environment variables directly to .env
sem env pull main/production \\
  --format dotenv \\
  --output .env.production`,
  SDK: `import { SEMClient } from "@sem/sdk";

const sem = new SEMClient({ apiKey: process.env.SEM_API_KEY });
const secrets = await sem.secrets.get("main", "production");
console.log(secrets.DATABASE_URL);`,
  "REST API": `curl -X GET "https://sem.yourdomain.com/api/v1/projects/main/envs/production/secrets" \\
  -H "Authorization: Bearer sem_live_..." \\
  -H "Accept: application/json"`,
  "Remote Dotenv": `# Execute command with remote injected secrets
sem run --project main --env production -- npm start`,
};

export default function HomePage() {
  const { token } = useWorkspace();
  const [activeCodeTab, setActiveCodeTab] = useState<string>("CLI");
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeCodeTab] || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* 1. Redesigned Global Navigation Bar (Matching Reference Design) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#07090e]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-3.5"
            : "bg-transparent border-b border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 shrink-0 rounded-xl p-1 bg-gradient-to-br from-blue-500/25 to-purple-500/15 border border-white/[0.1] group-hover:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all">
              <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
            </div>
            <div>
              <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                SEM
              </span>
              <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400 leading-none">
                Secure Environment Manager
              </p>
            </div>
          </Link>

          {/* Center Links matching reference design */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-medium text-zinc-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#integrations" className="hover:text-white transition-colors">Integrations</a>
            <a href="#self-hosted" className="hover:text-white transition-colors">Self-hosted</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a
              href="https://github.com/niranjansah87/Secure-Enviornment-Manager#documentation"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Docs
            </a>
          </nav>

          {/* Right CTA Area matching reference design */}
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white transition-colors p-1.5"
              aria-label="GitHub"
            >
              <GithubIcon className="h-4 w-4" />
            </Link>
            <Link
              href={token ? "/dashboard" : "/login"}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              <span>{token ? "Dashboard" : "Log in"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Matching Reference Design: Full-Width Cinematic Vista) */}
      <section className="relative min-h-[640px] lg:min-h-[720px] pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden flex items-center">
        {/* Full Width Cinematic Mountain Vista Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/home/hero.png"
            alt="Hero Background"
            fill
            priority
            className="object-cover object-right md:object-center filter brightness-[0.8] contrast-[1.05]"
          />
          {/* Subtle directional gradient overlay matching reference design */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/30 to-[#07090e]/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/75 to-transparent max-w-4xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-2xl space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Clean Single-Color Pill without multiple rainbow accents */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/[0.1] bg-[#0c101a]/80 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="text-xs font-medium text-zinc-300">
                  Self-hosted &bull; Open Source
                </span>
              </div>

              {/* Clean Typography matching reference design */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                Environment <br />
                variables, finally <br />
                under control.
              </h1>

              <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl">
                Secure Environment Manager (SEM) is a self-hosted platform to securely manage,
                version, and sync your environment variables across projects and teams.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href={token ? "/dashboard" : "/login"}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.12] bg-[#0c101a]/70 hover:bg-[#121724] text-zinc-200 text-xs font-semibold transition-all backdrop-blur-md"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>View on GitHub</span>
                </Link>
              </div>

              {/* 3-Pill Trust Bar with Unified Cohesive Palette */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-8 border-t border-white/[0.08]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c101a]/60 border border-white/[0.08] backdrop-blur-md">
                  <Lock className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Encrypted at rest</p>
                    <p className="text-[11px] text-zinc-400">AES-256 (Fernet)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c101a]/60 border border-white/[0.08] backdrop-blur-md">
                  <Users className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Built for teams</p>
                    <p className="text-[11px] text-zinc-400">RBAC, audit logs, API keys</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c101a]/60 border border-white/[0.08] backdrop-blur-md">
                  <Layers className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Developer friendly</p>
                    <p className="text-[11px] text-zinc-400">Web UI, CLI, SDK & dotenv</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Pipeline Stepper Section ("From Development to Production") */}
      <section id="how-it-works" className="py-20 border-t border-white/[0.08] bg-[#07090e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p className="text-[11px] uppercase tracking-widest font-mono text-blue-400 mb-2">
            FROM DEVELOPMENT TO PRODUCTION
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            One source of truth for all your environments
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mb-14">
            SEM helps engineering teams manage secrets across the entire development lifecycle —
            from local development to production deployments.
          </p>

          {/* Stepper Cards with Scroll Motion & Hover Lift */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 relative"
          >
            {PIPELINE_STAGES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
                  }}
                  whileHover={{ y: -5, transition: { duration: 0.15 } }}
                  className="relative flex flex-col items-center"
                >
                  <div className="w-full flex-1 p-5 rounded-2xl border border-white/[0.08] bg-[#0c101a]/75 hover:bg-[#121724] hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all text-center flex flex-col items-center justify-center min-h-[175px]">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 mb-3 shadow-inner group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-1">{s.title}</h3>
                    <p className="text-xs text-zinc-400 leading-normal">{s.desc}</p>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 text-zinc-600">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. Modern Interface Showcase Section */}
      <section id="features" className="py-24 border-t border-white/[0.08] relative overflow-hidden bg-gradient-to-b from-[#07090e] via-[#0a0d16] to-[#07090e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Description & Feature bullets */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                A modern interface <br />
                for secure operations
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A clean, focused dashboard to manage secrets, track changes, and maintain security
                across all your environments.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    icon: Compass,
                    title: "Intuitive workspace navigation",
                    desc: "Switch between projects and environments seamlessly.",
                  },
                  {
                    icon: KeyRound,
                    title: "Powerful secret management",
                    desc: "Add, edit, import, export and search with millisecond speed.",
                  },
                  {
                    icon: History,
                    title: "Version history & rollback",
                    desc: "Track every change with full tamper-evident audit trail.",
                  },
                  {
                    icon: GitCompare,
                    title: "Environment comparison",
                    desc: "Detect and resolve configuration drift instantly.",
                  },
                  {
                    icon: BarChart3,
                    title: "Analytics and usage insights",
                    desc: "Visualize activity and monitor access patterns.",
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200">{item.title}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Link
                  href={token ? "/dashboard" : "/login"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-md"
                >
                  <span>Explore the interface</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Angled High-Fidelity UI Screenshot with subtle scroll elevation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-7 relative"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0c101a] shadow-[0_20px_60px_rgba(0,0,0,0.9)] hover:border-blue-500/30 transition-all">
                <Image
                  src="/home/Secure_Secrets_Dashboard_at_Sunset.png"
                  alt="Secrets Dashboard"
                  width={1400}
                  height={900}
                  className="w-full h-auto object-cover filter contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e]/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. Built for Developers: Workflow & CLI Section */}
      <section className="py-24 border-t border-white/[0.08] relative bg-[#07090e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Developer Workspace Image */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border border-white/[0.1] shadow-2xl h-[380px] md:h-[440px]">
                <Image
                  src="/home/Cinematic_Developer_Workspace_at_Dusk.png"
                  alt="Developer Workspace"
                  fill
                  className="object-cover object-center filter brightness-[0.8]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e]/80 via-transparent to-transparent" />
              </div>
            </div>

            {/* Right Terminal & Tabs */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-mono text-blue-400 mb-1.5">
                  BUILT FOR DEVELOPERS
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                  Integrates with your workflow
                </h2>
                <p className="text-sm text-zinc-400">
                  Access your environment variables from anywhere — web UI, CLI, SDK, or directly via REST API.
                </p>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/[0.08] bg-[#0c101a] w-fit">
                {Object.keys(CODE_EXAMPLES).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeCodeTab === tab
                        ? "bg-blue-600/30 text-white border border-blue-500/40"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Code Box */}
              <div className="relative rounded-2xl border border-white/[0.1] bg-[#0c101a] p-4 shadow-xl font-mono text-xs text-zinc-300">
                <button
                  onClick={handleCopyCode}
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all"
                  aria-label="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre className="overflow-x-auto pt-2 pb-1 leading-relaxed text-zinc-200">
                  {CODE_EXAMPLES[activeCodeTab]}
                </pre>
              </div>

              <div>
                <Link
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager#cli-guide"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.1] bg-[#0c101a] hover:bg-[#121724] text-zinc-200 text-xs font-semibold transition-all"
                >
                  <span>View documentation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Ecosystem Integration Grid */}
      <section id="integrations" className="py-20 border-t border-white/[0.08] bg-[#07090e] text-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p className="text-[11px] uppercase tracking-widest font-mono text-blue-400 mb-2">
            WORKS WITH YOUR STACK
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Ready for your entire ecosystem
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-10">
            Use SEM seamlessly with your existing tools, orchestrators, and infrastructure.
          </p>

          {/* Dual Row Continuous Animated Marquee with actual icons */}
          <div className="relative w-full overflow-hidden py-4">
            {/* Left & Right Edge Fades for Seamless Infinite Flow */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 md:w-44 z-20 bg-gradient-to-r from-[#07090e] via-[#07090e]/80 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 md:w-44 z-20 bg-gradient-to-l from-[#07090e] via-[#07090e]/80 to-transparent" />

            {/* Row 1: Leftward Marquee */}
            <div className="flex overflow-hidden mb-4">
              <div className="animate-marquee flex items-center gap-3.5">
                {[...STACK_ROW_1, ...STACK_ROW_1].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/[0.08] bg-[#0c101a]/80 backdrop-blur-md hover:bg-[#121724] hover:border-blue-500/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)] transition-all cursor-pointer group whitespace-nowrap"
                    >
                      <Icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Rightward Marquee */}
            <div className="flex overflow-hidden">
              <div className="animate-marquee-reverse flex items-center gap-3.5">
                {[...STACK_ROW_2, ...STACK_ROW_2].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/[0.08] bg-[#0c101a]/80 backdrop-blur-md hover:bg-[#121724] hover:border-blue-500/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)] transition-all cursor-pointer group whitespace-nowrap"
                    >
                      <Icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Security Deep Dive: "Your secrets stay yours" */}
      <section id="security" className="py-24 border-t border-white/[0.08] bg-[#07090e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-mono text-blue-400 mb-1.5">
                  SECURITY FIRST
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                  Your secrets stay yours
                </h2>
                <p className="text-sm text-zinc-400 max-w-lg">
                  SEM is self-hosted, giving you complete control over your sensitive data. No
                  third-party storage, no cloud lock-in, no compromises.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {[
                  {
                    title: "AES-256 encryption at rest",
                    desc: "All secrets encrypted using cryptographic Fernet tokens.",
                  },
                  {
                    title: "JWT authentication",
                    desc: "Secure token-based access with device tracking and session control.",
                  },
                  {
                    title: "Role-based access control",
                    desc: "Admin and developer roles with granular scoped permissions.",
                  },
                  {
                    title: "Complete audit logs",
                    desc: "Track all access and changes with tamper-evident, append-only logs.",
                  },
                ].map((s, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100">{s.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager#security"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-md"
                >
                  <span>Learn about security</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 3D Vault Graphic */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border border-white/[0.1] shadow-2xl h-[380px] md:h-[440px]">
                <Image
                  src="/Cinematic_Futuristic_Data_Vault.png"
                  alt="Futuristic Data Vault"
                  fill
                  className="object-cover object-center filter contrast-[1.1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e]/80 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Testimonial Banner */}
          <div className="mt-16 p-6 rounded-2xl border border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-md flex flex-col sm:flex-row items-center gap-5 max-w-3xl mx-auto">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-sm font-bold text-white shrink-0">
              NS
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-zinc-200 italic mb-1">
                &ldquo;SEM has become an essential part of our deployment workflow. Simple, secure
                and powerful.&rdquo;
              </p>
              <p className="text-xs font-semibold text-zinc-400">
                Niranjan Sah &mdash;{" "}
                <span className="text-zinc-500 font-normal">Independent Developer & Tech Lead</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Ready to take control banner & Footer */}
      <section className="relative py-28 border-t border-white/[0.08] overflow-hidden text-center bg-[#07090e]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/home/above_footor.png"
            alt="Scenic Mountain Vista"
            fill
            className="object-cover object-center filter brightness-[0.5] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-[#07090e]/90" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-widest font-mono text-blue-400 mb-2">
            READY TO TAKE CONTROL?
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
            Start managing your environment variables today.
          </h2>
          <p className="text-sm md:text-base text-zinc-300 max-w-xl mx-auto mb-8">
            Self-hosted. Open source. Built for modern engineering teams.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href={token ? "/dashboard" : "/login"}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] bg-[#0c101a]/80 hover:bg-[#121724] text-zinc-200 text-sm font-medium transition-all"
            >
              <GithubIcon className="w-4 h-4" />
              <span>View on GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Redesigned Footer (Matching Reference Design exactly: 5 Columns + Social Links) */}
      <footer className="border-t border-white/[0.08] bg-[#05070a] pt-16 pb-12 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-xl p-1 bg-blue-500/10 border border-blue-500/20">
                <Image src="/logo.png" alt="SEM" fill className="object-contain" />
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-tight">SEM</span>
                <p className="text-[9px] uppercase tracking-wider font-medium text-zinc-500 leading-none">
                  Secure Environment Manager
                </p>
              </div>
            </Link>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Self-hosted platform to securely manage, version, and sync environment variables across projects and teams.
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-200 mb-3.5">Product</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#self-hosted" className="hover:text-white transition-colors">Self-hosted</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-200 mb-3.5">Resources</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager#documentation"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Releases
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Community */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-200 mb-3.5">Community</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/discussions"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Discussions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/blob/main/CODE_OF_CONDUCT.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Code of Conduct
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  License
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Stay Updated & Social Icons Row */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-200 mb-3.5">Stay updated</h4>
            <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
              Get the latest releases, security advisories, and architecture notes.
            </p>
            <div className="flex items-center gap-1.5 mb-5">
              <input
                type="email"
                placeholder="Enter your email"
                className="h-9 px-3 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 flex-1"
              />
              <button
                className="h-9 w-9 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shrink-0 transition-colors shadow-sm"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Social Icons matching reference */}
            <div className="flex items-center gap-3 text-zinc-400 pt-1">
              <a
                href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                aria-label="GitHub"
              >
                <FaGithub className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://linkedin.com/in/niranjansah87"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://x.com/niranjansah87"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                aria-label="X (Twitter)"
              >
                <FaXTwitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="mailto:contact@niranjansah87.com.np"
                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                aria-label="Email"
              >
                <FiMail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Attribution Bar */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 mt-12 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div>&copy; {new Date().getFullYear()} Secure Environment Manager. Open source under MIT License.</div>
          <div>Made with ❤️ by Niranjan Sah</div>
        </div>
      </footer>
    </div>
  );
}
