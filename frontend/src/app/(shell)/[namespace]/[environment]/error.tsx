"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ChevronLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EnvironmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    } else if (error?.digest) {
      console.error(`[SEM] Error digest: ${error.digest}`);
    }
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8"
    >
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
          <AlertTriangle className="h-6 w-6 text-orange-400" />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">Environment failed to load</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Could not load this environment. The environment may not exist, or your token may lack access.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            size="sm"
            onClick={reset}
            className="bg-white text-black hover:bg-zinc-200 font-medium"
          >
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Link href="/projects">
              <ChevronLeft className="mr-2 h-3.5 w-3.5" />
              All projects
            </Link>
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 text-left overflow-auto max-h-32">
            <p className="text-orange-400 font-mono text-xs break-all">{error.message}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
