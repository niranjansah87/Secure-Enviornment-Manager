"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, ArrowRight, ShieldCheck, Zap, Server,
  Eye, EyeOff, RefreshCw, User, KeyRound,
  BookOpen, Terminal, Package,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginMode = "admin" | "apikey" | "user";

const MODES: { id: LoginMode; label: string; icon: React.ReactNode }[] = [
  { id: "admin",  label: "Admin Access", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: "apikey", label: "API Key",       icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: "user",   label: "User Login",    icon: <User className="w-3.5 h-3.5" /> },
];

const FEATURES = [
  {
    icon: <ShieldCheck className="w-5 h-5 text-violet-400" />,
    title: "Full data ownership",
    desc: "Your secrets never leave your infrastructure. Self-hosted, encrypted at rest.",
  },
  {
    icon: <Zap className="w-5 h-5 text-violet-400" />,
    title: "Enterprise ready",
    desc: "RBAC, audit logs, API keys, team management, and SMTP notifications.",
  },
  {
    icon: <Server className="w-5 h-5 text-violet-400" />,
    title: "Developer friendly",
    desc: "REST API, CLI tool, SDK support, and .env export in seconds.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, setToken, refreshAccessToken, token } = useWorkspace();

  const [mode, setMode] = useState<LoginMode>("admin");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (mode === "user" && !username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await loginWithPassword(
        password.trim(),
        "global",
        "main",
        mode === "user" ? username.trim() : "",
      );
      router.push("/dashboard");
    } catch {
      if (mode === "admin") {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8070"}/api/v1/auth/validate-password`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: password.trim() }),
            }
          );
          if (response.ok) {
            setToken(password.trim());
            router.push("/dashboard");
            return;
          }
        } catch { /* ignore */ }
      }
      setError(
        mode === "user"   ? "Invalid username or password." :
        mode === "apikey" ? "Invalid API key." :
                            "Invalid password or token."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const success = await refreshAccessToken();
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Session expired. Please login again.");
      }
    } catch {
      setError("Failed to restore session.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasExistingSession = typeof window !== "undefined" && (
    localStorage.getItem("sem_refresh_token") ||
    localStorage.getItem("sem_access_token")
  );

  return (
    <div className="flex min-h-screen bg-[#060608]">
      {/* Left panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col">
        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src="/admin_header_image.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-violet-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              width={40}
              height={40}
              alt="SEM"
              className="rounded-xl ring-1 ring-white/20 group-hover:ring-violet-400/50 transition-all"
              unoptimized
            />
            <div>
              <span className="text-white font-bold text-lg leading-none block">SEM</span>
              <span className="text-zinc-400 text-xs leading-none">Secure Environment Manager</span>
            </div>
          </Link>

          {/* Hero text */}
          <div className="mt-auto mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl font-bold text-white leading-tight mb-3"
            >
              Your environment variables,
              <br />
              <span className="text-violet-400">secured.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-zinc-400 text-base mb-10"
            >
              One place to store, manage, and share secrets across all your environments.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-5"
            >
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{f.desc}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Footer links */}
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            {[
              { icon: <Terminal className="w-3.5 h-3.5" />, label: "GitHub" },
              { icon: <BookOpen className="w-3.5 h-3.5" />, label: "Docs" },
              { icon: <Terminal className="w-3.5 h-3.5" />, label: "CLI" },
              { icon: <Package className="w-3.5 h-3.5" />, label: "SDK" },
            ].map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Image src="/logo.png" width={36} height={36} alt="SEM" className="rounded-xl ring-1 ring-white/10" unoptimized />
            <span className="text-white font-bold">Secure Environment Manager</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              {hasExistingSession && !token ? "Session Expired" : "Sign in to SEM"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {hasExistingSession && !token
                ? "Restore your previous session or sign in again."
                : "Access your environments and secrets securely."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d0f18] p-7 shadow-2xl">
            {hasExistingSession && !token ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 p-4 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-violet-400" />
                  <p className="text-sm text-zinc-300">Previous session found. Restore it?</p>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleRefreshToken}
                    disabled={isRefreshing}
                    className="flex-1 h-11 rounded-xl bg-violet-600 font-medium text-white hover:bg-violet-500 transition-all"
                  >
                    {isRefreshing ? "Restoring..." : "Restore Session"}
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.removeItem("sem_access_token");
                      localStorage.removeItem("sem_refresh_token");
                      localStorage.removeItem("sem_device_id");
                      localStorage.removeItem("sem_api_token");
                      window.location.reload();
                    }}
                    className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 font-medium text-zinc-300 hover:bg-white/10 transition-all"
                  >
                    Sign In Again
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Mode tabs */}
                <div className="flex rounded-xl border border-white/8 bg-black/30 p-1 gap-1">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMode(m.id); setError(null); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        mode === m.id
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* Username (user mode only) */}
                <AnimatePresence>
                  {mode === "user" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative group overflow-hidden"
                    >
                      <User className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="h-11 border-white/8 bg-black/40 pl-10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl"
                        required
                        autoComplete="username"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password / token */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "admin"  ? "Dashboard password or master token" :
                      mode === "apikey" ? "Enter your API key" :
                                          "Password"
                    }
                    className="h-11 border-white/8 bg-black/40 pl-10 pr-10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl"
                    required
                    autoFocus={mode !== "user"}
                    autoComplete={mode === "user" ? "current-password" : "off"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20"
                >
                  {loading ? "Authenticating..." : "Unlock Workspace"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>

          {/* Security badges */}
          <div className="mt-5 flex justify-center gap-5">
            {[
              { icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />, label: "AES-256" },
              { icon: <Zap className="h-3.5 w-3.5 text-emerald-400" />, label: "Rate Limited" },
              { icon: <Server className="h-3.5 w-3.5 text-emerald-400" />, label: "Secure Session" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 text-xs text-zinc-600">
                {b.icon}
                {b.label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
