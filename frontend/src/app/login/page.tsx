"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck, Zap, Server, Eye, EyeOff, RefreshCw, User, KeyRound } from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Login3DAnimation } from "@/components/animations/login-3d";

type LoginMode = "dashboard" | "token" | "user";

const MODES: { id: LoginMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: <ShieldCheck className="w-3.5 h-3.5" />, desc: "Admin dashboard password" },
  { id: "token",     label: "API Token",  icon: <KeyRound className="w-3.5 h-3.5" />,   desc: "Master API token" },
  { id: "user",      label: "User Login", icon: <User className="w-3.5 h-3.5" />,       desc: "Username & password" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, setToken, refreshAccessToken, token } = useWorkspace();

  const [mode, setMode] = useState<LoginMode>("dashboard");
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
      // Fallback to legacy API key path for dashboard/token modes only
      if (mode !== "user") {
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
        mode === "user"
          ? "Invalid username or password."
          : "Invalid password or token."
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const, when: "beforeChildren", staggerChildren: 0.1 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-zinc-100 overflow-hidden relative selection:bg-violet-500/30 font-sans pointer-events-none">
      <div className="pointer-events-auto absolute inset-0 z-0">
        <Login3DAnimation />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md pointer-events-auto"
      >
        <div className="rounded-2xl border border-white/10 bg-[#0d111c]/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          <motion.div variants={itemVariants} className="mb-6 text-center">
            <Link href="/" className="inline-block hover:scale-105 transition-transform duration-300">
              <Image
                src="/logo.png"
                width={56}
                height={56}
                alt="Logo"
                className="mx-auto mb-4 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-white/10"
                unoptimized
              />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
              {hasExistingSession && !token ? "Session Expired" : "Secure Login"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {hasExistingSession && !token
                ? "Your session has expired. Restore it or login again."
                : "Authenticate to access your environments."}
            </p>
          </motion.div>

          {hasExistingSession && !token ? (
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-violet-400" />
                <p className="text-sm text-zinc-300">We found a previous session. Would you like to restore it?</p>
              </div>
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </motion.div>
              )}
              <div className="flex gap-3">
                <Button onClick={handleRefreshToken} disabled={isRefreshing}
                  className="flex-1 h-12 rounded-xl bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] font-medium text-white hover:bg-violet-500 transition-all">
                  {isRefreshing ? "Restoring..." : "Restore Session"}
                </Button>
                <Button onClick={() => {
                  localStorage.removeItem("sem_access_token");
                  localStorage.removeItem("sem_refresh_token");
                  localStorage.removeItem("sem_device_id");
                  localStorage.removeItem("sem_api_token");
                  window.location.reload();
                }} className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 font-medium text-zinc-300 hover:bg-white/10 transition-all">
                  Login Again
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mode selector */}
              <motion.div variants={itemVariants}>
                <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/30 p-1 gap-1">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMode(m.id); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        mode === m.id
                          ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      {m.icon}
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-zinc-600 mt-1.5">
                  {MODES.find(m => m.id === mode)?.desc}
                </p>
              </motion.div>

              {/* Username field — only for user mode */}
              {mode === "user" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative group"
                >
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 group-focus-within:text-violet-400 transition-colors" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="h-12 border-white/10 bg-black/40 pl-11 text-zinc-100 placeholder:text-zinc-500 hover:bg-black/60 focus:border-violet-500 focus:bg-black/60 focus:ring-violet-500/20 transition-all rounded-xl"
                    required={mode === "user"}
                    autoComplete="username"
                  />
                </motion.div>
              )}

              {/* Password / token field */}
              <motion.div variants={itemVariants} className="relative group">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 group-focus-within:text-violet-400 transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "dashboard" ? "Dashboard password" :
                    mode === "token"     ? "Master API token" :
                                          "Password"
                  }
                  className="h-12 border-white/10 bg-black/40 pl-11 pr-11 text-zinc-100 placeholder:text-zinc-500 hover:bg-black/60 focus:border-violet-500 focus:bg-black/60 focus:ring-violet-500/20 transition-all rounded-xl"
                  required
                  autoFocus={mode !== "user"}
                  autoComplete={mode === "user" ? "current-password" : "off"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] font-medium text-white hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all"
                >
                  {loading ? "Authenticating..." : "Unlock Dashboard"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </motion.div>
            </form>
          )}

          <motion.div variants={itemVariants} className="mt-8 flex justify-center gap-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>AES-256</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Zap className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>Rate Limited</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Server className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>Secure Session</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
