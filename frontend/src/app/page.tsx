"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Zap, Server,
  Lock, GitBranch, Users, Globe, Terminal,
  Mail, CheckCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useWorkspace } from "@/context/workspace-context";

const Security3DAnimation = dynamic(
  () => import("@/components/animations/security-3d").then((mod) => mod.Security3DAnimation),
  { ssr: false }
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
  </svg>
);

const FEATURES = [
  {
    icon: <Lock className="w-6 h-6 text-violet-400" />,
    title: "AES-256 Encryption",
    desc: "Every secret encrypted at rest using Fernet AES-256. Keys never leave your server.",
    color: "violet",
  },
  {
    icon: <GitBranch className="w-6 h-6 text-blue-400" />,
    title: "Version History",
    desc: "Encrypted snapshots of every environment. Roll back to any point in seconds.",
    color: "blue",
  },
  {
    icon: <Users className="w-6 h-6 text-emerald-400" />,
    title: "Team Access Control",
    desc: "RBAC, API keys, scoped users, audit logs. Full visibility into who did what and when.",
    color: "emerald",
  },
  {
    icon: <Terminal className="w-6 h-6 text-orange-400" />,
    title: "CLI & SDK Ready",
    desc: "Access secrets from anywhere. .env export, REST API, and Python/Node SDK support.",
    color: "orange",
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    title: "Instant Sync",
    desc: "Real-time updates across all environments. Changes propagate instantly, zero downtime.",
    color: "yellow",
  },
  {
    icon: <Server className="w-6 h-6 text-pink-400" />,
    title: "Self-Hosted",
    desc: "Full data sovereignty. Deploy on your own infrastructure. No cloud vendor lock-in.",
    color: "pink",
  },
];

const SECURITY_FEATURES = [
  "AES-256 Fernet encryption at rest",
  "PBKDF2 password hashing (SHA-256)",
  "JWT tokens with 15-min expiry",
  "Rate-limited API endpoints",
  "Append-only audit trail",
  "Optional SMTP notifications",
];

export default function Home() {
  const { token } = useWorkspace();

  return (
    <div className="flex min-h-screen flex-col bg-[#060608] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.png" width={32} height={32} alt="SEM" className="rounded-lg ring-1 ring-white/10 group-hover:ring-violet-400/50 transition-all" unoptimized />
          <div>
            <span className="text-white font-bold text-sm leading-none block">SEM</span>
            <span className="text-zinc-500 text-[10px] leading-none">Secure Environment Manager</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#integrations" className="hover:text-white transition-colors">Integrations</a>
          <a href="https://github.com/niranjansah87" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
            <GithubIcon className="h-4 w-4" />
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-xs hidden sm:flex">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs shadow-lg shadow-violet-500/20">
            <Link href={token ? "/dashboard" : "/login"}>
              {token ? "Dashboard" : "Get Started"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16 pointer-events-none">
        <div className="pointer-events-auto absolute inset-0 z-0">
          <Security3DAnimation />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060608]/20 to-[#060608]" />

        <div className="relative z-10 pointer-events-auto max-w-6xl mx-auto px-6 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-300 mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              Enterprise-grade secrets management
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-none mb-6">
              Your secrets.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
                Fully yours.
              </span>
            </h1>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
              Secure Environment Manager gives your team one place to store, manage, and share secrets across all projects and environments — encrypted, audited, versioned.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-8 bg-violet-600 hover:bg-violet-500 text-white shadow-2xl shadow-violet-500/30 text-sm font-semibold">
                <Link href={token ? "/dashboard" : "/login"}>
                  {token ? "Open Dashboard" : "Start Managing Secrets"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium">
                <a href="https://github.com/niranjansah87" target="_blank" rel="noopener noreferrer">
                  <GithubIcon className="mr-2 h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-zinc-500">
              {[
                { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, label: "AES-256 encrypted" },
                { icon: <Server className="h-4 w-4 text-blue-400" />, label: "Self-hosted" },
                { icon: <Zap className="h-4 w-4 text-yellow-400" />, label: "Open source" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Everything your team needs
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              A complete secrets management platform built for modern development teams.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 group-hover:border-white/15 transition-all">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security section */}
      <section id="security" className="py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300 mb-6">
                <ShieldCheck className="h-3.5 w-3.5" />
                Security first
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Built for security,<br />not just compliance.
              </h2>
              <p className="text-zinc-500 text-base mb-8 leading-relaxed">
                Every layer of SEM is designed with security in mind. From encryption at rest to audit logs, your secrets are protected by multiple layers of defense.
              </p>
              <ul className="space-y-3">
                {SECURITY_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-zinc-400">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <Image
                  src="/admin_header_image.png"
                  alt="Secure infrastructure"
                  width={600}
                  height={400}
                  className="w-full object-cover opacity-60"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Encryption", value: "AES-256" },
                      { label: "Hashing", value: "PBKDF2" },
                      { label: "Sessions", value: "JWT" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm px-3 py-2 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Works with your stack</h2>
          <p className="text-zinc-500 mb-12">Access your secrets from any language or platform.</p>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {["Node.js", "Python", "Go", "Java", "Docker", ".env", "REST API", "CLI"].map((tech) => (
              <div key={tech} className="rounded-xl border border-white/8 bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-400 hover:border-white/15 hover:text-white transition-all">
                {tech}
              </div>
            ))}
          </div>

          {/* CTA card */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/5" />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-3">Ready to secure your secrets?</h3>
              <p className="text-zinc-400 mb-8">Self-host in minutes. Full control, no cloud dependency.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20">
                  <Link href={token ? "/dashboard" : "/login"}>
                    {token ? "Open Dashboard" : "Get Started Free"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  <a href="https://github.com/niranjansah87" target="_blank" rel="noopener noreferrer">
                    <GithubIcon className="mr-2 h-4 w-4" />
                    Star on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" width={28} height={28} alt="SEM" className="rounded-lg ring-1 ring-white/10" unoptimized />
            <span className="text-sm text-zinc-500">Secure Environment Manager</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <a href="https://github.com/niranjansah87" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors flex items-center gap-1.5">
              <GithubIcon className="h-3.5 w-3.5" /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/niranjan-sah/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors flex items-center gap-1.5">
              <LinkedinIcon className="h-3.5 w-3.5" /> LinkedIn
            </a>
            <a href="mailto:niranjansah250@gmail.com" className="hover:text-zinc-400 transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
            <a href="https://niranjansah87.com.np/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Portfolio
            </a>
          </div>
          <p className="text-xs text-zinc-600">Made by <span className="text-zinc-400">Niranjan Sah</span></p>
        </div>
      </footer>
    </div>
  );
}
