"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCcw, LayoutDashboard, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1),transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full text-center z-10 p-8 rounded-3xl bg-zinc-900/30 backdrop-blur-xl border border-white/5 shadow-2xl"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold mb-2 tracking-tight">Something went wrong</h1>
        <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
          We encountered an unexpected error while processing your request. Don&apos;t worry, your data is safe.
        </p>



        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={reset}
            className="rounded-full bg-white text-black hover:bg-zinc-200 transition-all h-12 px-8 font-medium shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-zinc-800 hover:bg-zinc-900 transition-all h-12 px-8 font-medium"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-left overflow-auto max-h-40">
             <p className="text-red-400 font-mono text-xs break-all">{error.message}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
