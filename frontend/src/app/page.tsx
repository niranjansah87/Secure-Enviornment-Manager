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
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import Dashboard3DShowcase from "@/components/animations/dashboard-3d-showcase";
import HeroPillars3D from "@/components/animations/hero-pillars-3d";
import HeroArtwork3D from "@/components/landing/hero-artwork-3d";
import DeveloperWorkflowTerminal from "@/components/landing/developer-workflow-terminal";
import Security3DCard from "@/components/animations/security-3d-card";
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

  // Robust typewriter effect for hero headline
  const line1 = "Environment";
  const line2 = "variables, finally";
  const line3 = "under control.";

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text3, setText3] = useState("");
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (phase === 1) {
      if (text1.length < line1.length) {
        timeout = setTimeout(() => {
          setText1(line1.slice(0, text1.length + 1));
        }, 55);
      } else {
        timeout = setTimeout(() => setPhase(2), 150);
      }
    } else if (phase === 2) {
      if (text2.length < line2.length) {
        timeout = setTimeout(() => {
          setText2(line2.slice(0, text2.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => setPhase(3), 150);
      }
    } else if (phase === 3) {
      if (text3.length < line3.length) {
        timeout = setTimeout(() => {
          setText3(line3.slice(0, text3.length + 1));
        }, 50);
      } else {
        setPhase(4);
      }
    }
    return () => clearTimeout(timeout);
  }, [phase, text1, text2, text3]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeCodeTab] || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white selection:bg-white/20 overflow-x-hidden">
      <SmoothScroll />
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
            <div className="relative h-9 w-9 shrink-0 rounded-xl p-1 bg-white/[0.06] border border-white/[0.12] group-hover:border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-all">
              <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
            </div>
            <div>
              <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-zinc-200 transition-colors">
                SEM
              </span>
              <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400 leading-none">
                Secure Environment Manager
              </p>
            </div>
          </Link>

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

      {/* 2. Hero Section */}
      <section className="relative min-h-[720px] lg:min-h-[820px] xl:min-h-[880px] flex flex-col justify-between pt-36 sm:pt-40 md:pt-44 pb-14 md:pb-16 overflow-hidden">
        {/* Right-Aligned Native Scale Artwork with 3D Depth & Tilt */}
        <HeroArtwork3D />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full flex-1 flex flex-col justify-between">
          {/* Hero Content Area (Left-aligned matching reference design) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-xl lg:max-w-2xl space-y-6 pt-4"
          >
            {/* Typing Animated Headline with glowing terminal cursor */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white leading-[1.06] min-h-[140px] sm:min-h-[170px] lg:min-h-[220px]">
              <span className="block">
                {text1 || (phase === 1 ? "" : line1)}
                {phase === 1 && (
                  <span className="inline-block w-[3px] h-[0.82em] bg-white ml-1.5 translate-y-[2px] animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                )}
              </span>
              <span className="block">
                {text2 || (phase >= 2 ? text2 : "")}
                {phase === 2 && (
                  <span className="inline-block w-[3px] h-[0.82em] bg-white ml-1.5 translate-y-[2px] animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                )}
              </span>
              <span className="block">
                {text3 || (phase >= 3 ? text3 : "")}
                {(phase === 3 || phase === 4) && (
                  <span className="inline-block w-[3px] h-[0.82em] bg-white ml-1.5 translate-y-[2px] animate-[pulse_1s_infinite] shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                )}
              </span>
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-lg">
              Secure Environment Manager (SEM) is a self-hosted platform to securely manage,
              version, and sync your environment variables across projects and teams.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href={token ? "/dashboard" : "/login"}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.12] bg-[#0c101a]/70 hover:bg-[#121724] text-zinc-200 text-xs sm:text-sm font-semibold transition-all backdrop-blur-md"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>View on GitHub</span>
              </Link>
            </div>
          </motion.div>

          {/* 3 Value Pillars with interactive 3D WebGL scenes, spring tilt, and hover animations */}
          <HeroPillars3D />
        </div>
      </section>


      {/* 3. Pipeline Stepper Section ("From Development to Production") */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.08] bg-[#07090e] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center relative z-10">
          <p className="text-xs uppercase tracking-widest font-mono text-zinc-400 mb-3">
            FROM DEVELOPMENT TO PRODUCTION
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
            One source of truth for all your environments
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mb-16 leading-relaxed">
            SEM helps engineering teams manage secrets across the entire development lifecycle —
            from local development to production deployments.
          </p>

          {/* Minimalist Linear / Vercel Connected Stage Grid (Monochrome) */}
          <div className="relative max-w-6xl mx-auto">
            {/* Subtle connecting conduit line & smooth pure monochrome light beam across cards */}
            <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] -translate-y-1/2 z-0">
              <div className="h-[1px] w-full bg-white/[0.08] relative overflow-hidden">
                <motion.div
                  className="absolute top-0 bottom-0 w-36 bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                  animate={{
                    left: ["-25%", "125%"],
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </div>

            {/* 5 Restrained Linear/Vercel Cards */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.08 } },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10"
            >
              {PIPELINE_STAGES.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.35, ease: "easeOut" },
                      },
                    }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="relative rounded-2xl p-6 border border-white/[0.08] bg-[#0c0e14]/80 hover:bg-[#121520] hover:border-white/25 text-left flex flex-col justify-start min-h-[180px] transition-all duration-200 group cursor-pointer overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                  >
                    {/* Subtle top edge pure white border-beam highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-white/40 transition-all duration-300" />

                    {/* Icon Container */}
                    <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:border-white/25 group-hover:bg-white/[0.08] transition-all duration-200 mb-5 shrink-0 relative z-10 shadow-inner">
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors mb-2">
                      {s.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal group-hover:text-zinc-300 transition-colors">
                      {s.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
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
                    <div key={i} className="flex items-start gap-3.5 group">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner group-hover:border-white/30 group-hover:bg-white/[0.1] transition-all">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">{item.title}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
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

            {/* Right: 3D interactive showcase with mouse perspective tilt, spring physics, and white glare */}
            <Dashboard3DShowcase />
          </div>
        </div>
      </section>

      {/* 5. Built for Developers: Animated Workflow Terminal Showcase */}
      <DeveloperWorkflowTerminal />

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
                <p className="text-[11px] uppercase tracking-widest font-mono text-zinc-400 mb-1.5">
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
                    icon: Lock,
                    title: "AES-256 encryption at rest",
                    desc: "All secrets encrypted using cryptographic Fernet tokens.",
                  },
                  {
                    icon: KeyRound,
                    title: "JWT authentication",
                    desc: "Secure token-based access with device tracking and session control.",
                  },
                  {
                    icon: Users,
                    title: "Role-based access control",
                    desc: "Admin and developer roles with granular scoped permissions.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Complete audit logs",
                    desc: "Track all access and changes with tamper-evident, append-only logs.",
                  },
                ].map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3.5 group">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner group-hover:border-white/30 group-hover:bg-white/[0.1] transition-all">
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">{s.title}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
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

            {/* Right 3D Vault Graphic with mouse perspective tilt */}
            <Security3DCard />
          </div>

          {/* Testimonial Banner */}
          <div className="mt-16 p-6 rounded-2xl border border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-md flex flex-col sm:flex-row items-center gap-5 max-w-3xl mx-auto">
            <div className="h-12 w-12 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
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

      {/* Ultra-Compact Clean Footer */}
      <footer className="border-t border-white/[0.08] bg-[#05070a] py-8 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Brand Identity & Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-7 w-7 rounded-lg p-0.5 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                <Image src="/logo.png" alt="SEM" fill className="object-contain" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                SEM
              </span>
            </Link>
            <span className="text-zinc-600 hidden sm:inline">&bull;</span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Secure Environment Manager
            </span>
          </div>

          {/* Right: Exact Personal Social Links */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://github.com/niranjansah87"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
              aria-label="GitHub Profile"
            >
              <FaGithub className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.linkedin.com/in/niranjan-sah/"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
              aria-label="LinkedIn Profile"
            >
              <FaLinkedinIn className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://x.com/niranjan8790"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
              aria-label="X Profile"
            >
              <FaXTwitter className="h-3.5 w-3.5" />
            </a>
            <a
              href="mailto:niranjansah250@gmail.com"
              className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
              aria-label="Email Niranjan Sah"
            >
              <FiMail className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Bottom Attribution Line */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 mt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div>&copy; {new Date().getFullYear()} Secure Environment Manager. Open source under MIT License.</div>
          <div>
            Made with ❤️ by{" "}
            <a
              href="https://niranjansah87.com.np/"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white font-medium underline underline-offset-4 decoration-zinc-700 hover:decoration-blue-400 transition-colors"
            >
              Niranjan Sah
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
