"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  KeyRound,
  Boxes,
  Layers,
  BookOpen,
  Terminal,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { ApiError, type LoginParams } from "@/lib/sem-api";
import { Button } from "@/components/ui/button";

type LoginMode = "admin" | "apikey" | "user";

const MODES: { id: LoginMode; flag: string; label: string; icon: React.ReactNode }[] = [
  { id: "admin", flag: "--admin", label: "Master Token", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: "apikey", flag: "--apikey", label: "API Key", icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: "user", flag: "--user", label: "User Login", icon: <User className="w-3.5 h-3.5" /> },
];

const VALUE_PROPS = [
  {
    icon: <Boxes className="w-4 h-4 text-zinc-200" />,
    title: "Full data ownership",
    desc: "Self-hosted & open source",
  },
  {
    icon: <Shield className="w-4 h-4 text-zinc-200" />,
    title: "Enterprise ready",
    desc: "RBAC, audit logs, API keys",
  },
  {
    icon: <Layers className="w-4 h-4 text-zinc-200" />,
    title: "Developer friendly",
    desc: "Web UI, CLI, SDK and remote dotenv",
  },
];

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useWorkspace();

  const [mode, setMode] = useState<LoginMode>("admin");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (mode === "user" && !username.trim()) return;

    setLoading(true);
    setError(null);

    const params: LoginParams = { device_name: "Web Browser Terminal" };
    if (mode === "admin") params.master_token = password.trim();
    else if (mode === "apikey") params.api_key = password.trim();
    else {
      params.username = username.trim();
      params.password = password.trim();
    }

    try {
      await login(params);
      router.push("/dashboard");
    } catch (err) {
      const fallback =
        mode === "user"
          ? "ERR_AUTH_FAILED: Invalid username or password."
          : mode === "apikey"
          ? "ERR_AUTH_FAILED: Invalid API key token."
          : "ERR_AUTH_FAILED: Invalid password or master token.";
      setError(err instanceof ApiError ? `ERR_${err.status || 401}: ${err.message || fallback}` : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#07090e] p-5 sm:p-6 lg:px-12 select-none">
      {/* Full Background Mountain Vista + Server Environment Asset */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/login_background.png"
          alt="Secure Environment Infrastructure"
          fill
          priority
          className="object-cover object-center filter brightness-[0.7] contrast-[1.05]"
        />
        {/* Cinematic Darkness & Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/65 to-[#07090e]/95" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#07090e]/40 to-[#07090e]" />
      </div>

      {/* 1. Header / Brand */}
      <header className="relative z-10 shrink-0 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 shrink-0 rounded-xl p-0.5 bg-white/[0.06] border border-white/[0.12] group-hover:border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-all">
            <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight group-hover:text-zinc-200 transition-colors">
              SEM
            </span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 leading-none">
              Secure Environment Manager
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-medium">
          <Link
            href="/docs"
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Docs</span>
          </Link>
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
          >
            Home
          </Link>
        </div>
      </header>

      {/* 2. Center Content Grid */}
      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center my-auto w-full max-w-7xl mx-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
          {/* Left Column: Headline & Value Props */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="space-y-3 max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                Your environment <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                  variables, secured.
                </span>
              </h1>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-lg">
                A self-hosted platform to securely manage, version, and sync your environment variables
                across projects and teams with zero cloud lock-in.
              </p>
            </div>

            {/* 3 Value Cards */}
            <div className="space-y-3 max-w-md pt-1">
              {VALUE_PROPS.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-2xl border border-white/[0.07] bg-[#0c101a]/70 backdrop-blur-md shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] shrink-0 shadow-inner">
                    {v.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{v.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Authentic Terminal Login Form */}
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#090d16]/95 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden font-mono">
              {/* Terminal Window Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0d121f] border-b border-white/[0.08]">
                {/* 3 macOS / Linux Dots */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]/90 border border-[#1aab29]" />
                </div>

                {/* Session Title */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>sem auth login</span>
                </div>

                {/* Security Tag */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>tty1</span>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 sm:p-6 space-y-4 text-xs">
                {/* Boot Banner */}
                <div className="space-y-0.5 text-zinc-500 text-[11px] pb-1 border-b border-white/[0.06]">
                  <p className="text-zinc-300 font-semibold">SEM Vault Shell v1.0.4</p>
                  <p>Target: self-hosted instance • Cipher: AES-256</p>
                </div>

                {/* CLI Mode Selector Tabs */}
                <div>
                  <div className="text-[11px] text-zinc-400 mb-2">
                    <span className="text-zinc-500">$</span> select authentication method:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/50 border border-white/[0.08]">
                    {MODES.map((m) => {
                      const active = mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setMode(m.id);
                            setError(null);
                          }}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all ${
                            active
                              ? "bg-white text-zinc-950 font-bold shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                          }`}
                        >
                          <span>{m.flag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive CLI Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                  {mode === "user" && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <span className="text-zinc-500">guest@sem:~$</span>
                        <span className="text-zinc-300">username:</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. niranjan"
                          className="w-full h-10 bg-black/60 border border-white/[0.12] rounded-xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <span className="text-zinc-500">vault@sem:~$</span>
                      <span className="text-zinc-300">
                        {mode === "admin" && "master_token:"}
                        {mode === "apikey" && "api_key:"}
                        {mode === "user" && "password:"}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === "admin"
                            ? "enter master token..."
                            : mode === "apikey"
                            ? "sem_live_..."
                            : "••••••••••••"
                        }
                        className="w-full h-10 bg-black/60 border border-white/[0.12] rounded-xl pl-3.5 pr-10 text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
                        autoFocus={mode !== "user"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember & Options */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-300 select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="rounded border-white/20 bg-black/60 accent-white focus:ring-0 focus:ring-offset-0"
                      />
                      <span>persist session</span>
                    </label>
                    <a
                      href="https://github.com/niranjansah87/Secure-Enviornment-Manager#troubleshooting"
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      reset credentials?
                    </a>
                  </div>

                  {/* Terminal Error Prompt */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 leading-relaxed font-mono"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Terminal Execution Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-white hover:bg-zinc-200 text-zinc-950 font-mono font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-zinc-950 animate-ping" />
                        <span>executing authentication...</span>
                      </span>
                    ) : (
                      <>
                        <span>$ sem unlock --vault</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Terminal Status Footer */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10.5px] text-zinc-500">
                  <span>[status: ready]</span>
                  <Link href="/docs" className="hover:text-zinc-300 transition-colors">
                    help: sem --help
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06] text-xs text-zinc-500">
        <div className="flex items-center gap-6">
          <Link
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <GithubIcon className="h-4 w-4" />
            <span>GitHub</span>
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Docs</span>
          </Link>
        </div>
        <div>
          Made by{" "}
          <Link
            href="https://niranjansah87.com.np/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Niranjan Sah
          </Link>
        </div>
      </footer>
    </div>
  );
}
