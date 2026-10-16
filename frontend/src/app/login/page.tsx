"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lock,
  ArrowRight,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  KeyRound,
  Boxes,
  Layers,
  Info,
  BookOpen,
  Terminal,
  Code2,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { ApiError, type LoginParams } from "@/lib/sem-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginMode = "admin" | "apikey" | "user";

const MODES: { id: LoginMode; label: string; icon: React.ReactNode }[] = [
  { id: "admin", label: "Admin Access", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "apikey", label: "API Key", icon: <KeyRound className="w-4 h-4" /> },
  { id: "user", label: "User Login", icon: <User className="w-4 h-4" /> },
];

const VALUE_PROPS = [
  {
    icon: <Boxes className="w-5 h-5 text-zinc-200" />,
    title: "Full data ownership",
    desc: "Self-hosted & open source",
  },
  {
    icon: <Shield className="w-5 h-5 text-zinc-200" />,
    title: "Enterprise ready",
    desc: "RBAC, audit logs, API keys",
  },
  {
    icon: <Layers className="w-5 h-5 text-zinc-200" />,
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

    const params: LoginParams = { device_name: "Web Browser" };
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
          ? "Invalid username or password."
          : mode === "apikey"
          ? "Invalid API key."
          : "Invalid password or master token.";
      setError(err instanceof ApiError ? err.message || fallback : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#07090e] p-6 lg:px-12 select-none">
      {/* Full Background Mountain Vista + Server Environment Asset */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login_background.png"
          alt="Secure Environment Infrastructure"
          fill
          priority
          className="object-cover object-center filter brightness-[0.7] contrast-[1.05]"
        />
        {/* Cinematic Darkness & Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/60 to-[#07090e]/90" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#07090e]/40 to-[#07090e]" />
      </div>

      {/* 1. Header / Brand */}
      <header className="relative z-10 shrink-0 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 shrink-0 rounded-xl p-0.5 bg-gradient-to-br from-blue-500/30 to-purple-500/20 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
              SEM
            </span>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 leading-none">
              Secure Environment Manager
            </p>
          </div>
        </Link>
      </header>

      {/* 2. Center Content Grid */}
      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center my-auto w-full max-w-7xl mx-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          {/* Left Column: Headline & Value Props */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="space-y-4 max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                Your environment <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
                  variables, secured.
                </span>
              </h1>
              <p className="text-base text-zinc-300 leading-relaxed max-w-lg">
                A self-hosted platform to securely manage, version, and sync your environment variables
                across projects and teams with zero cloud lock-in.
              </p>
            </div>

            {/* 3 Value Cards */}
            <div className="space-y-3.5 max-w-md pt-2">
              {VALUE_PROPS.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3.5 rounded-2xl border border-white/[0.07] bg-[#0c101a]/60 backdrop-blur-md shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] shrink-0 shadow-inner">
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

          {/* Right Column: Handcrafted Glass Auth Card (Previous Authentic Design) */}
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0c101a]/85 backdrop-blur-2xl p-7 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              {/* 3 Modes Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl border border-white/[0.08] bg-[#07090e]/70 mb-6">
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
                      className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "text-white bg-blue-600/30 border border-blue-500/40 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                      }`}
                    >
                      {m.icon}
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Heading */}
              <div className="space-y-1.5 mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to SEM</h2>
                <p className="text-xs text-zinc-400 leading-normal">
                  {mode === "admin" && "Enter your dashboard password or master token to access your workspace."}
                  {mode === "apikey" && "Enter a valid API key with appropriate workspace scopes."}
                  {mode === "user" && "Enter your team credentials to access your assigned namespaces."}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "user" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. niranjan"
                        className="pl-10 h-11 bg-black/40 border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-blue-500/50"
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {mode === "admin" && "Dashboard Password or Master Token"}
                    {mode === "apikey" && "API Key Token"}
                    {mode === "user" && "Password"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "admin"
                          ? "Enter your password or master token"
                          : mode === "apikey"
                          ? "sem_live_..."
                          : "••••••••"
                      }
                      className="pl-10 pr-10 h-11 bg-black/40 border-white/[0.1] text-zinc-100 placeholder:text-zinc-600 rounded-xl focus:border-blue-500/50"
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

                {/* Remember & Forgot Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Remember this device</span>
                  </label>
                  <a
                    href="https://github.com/niranjansah87/Secure-Enviornment-Manager#troubleshooting"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 leading-relaxed"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    "Authenticating..."
                  ) : (
                    <>
                      <span>Unlock Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {/* Security Note Callout */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-black/30 text-[11px] text-zinc-400 leading-normal mt-3">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Your credentials are never stored in the browser. All authentication is performed
                    securely with your self-hosted server.
                  </span>
                </div>
              </form>
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
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager#documentation"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Docs</span>
          </Link>
          <Link
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager#cli-usage"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <Terminal className="h-4 w-4" />
            <span>CLI</span>
          </Link>
          <Link
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager#sdks"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <Code2 className="h-4 w-4" />
            <span>SDK</span>
          </Link>
        </div>
        <div>Made by Niranjan Sah</div>
      </footer>
    </div>
  );
}
