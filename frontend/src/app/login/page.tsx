"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck, Zap, Server, Eye, EyeOff } from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Login3DAnimation } from "@/components/animations/login-3d";

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useWorkspace();
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Test the token
      await api.metaEnvironments(tokenInput.trim());
      // If it doesn't throw, token is valid
      setToken(tokenInput.trim());
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid password or token.");
      } else {
        setError("Failed to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
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
          <motion.div variants={itemVariants} className="mb-8 text-center">
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
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Secure Login</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Enter your dashboard password or API token to continue.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants} className="space-y-2">
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 group-focus-within:text-violet-400 transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter credential..."
                  className="h-12 border-white/10 bg-black/40 pl-11 pr-11 text-zinc-100 placeholder:text-zinc-500 hover:bg-black/60 focus:border-violet-500 focus:bg-black/60 focus:ring-violet-500/20 transition-all rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
              >
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

          <motion.div variants={itemVariants} className="mt-8 flex justify-center gap-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <ShieldCheck className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>AES-256</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Zap className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>Rate Limited</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Server className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>Secure Session</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
