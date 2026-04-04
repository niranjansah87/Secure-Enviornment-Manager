"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-6 md:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px] bg-zinc-800" />
          <Skeleton className="h-4 w-[150px] bg-zinc-800/50" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full bg-zinc-800" />
          <Skeleton className="h-10 w-[120px] rounded-md bg-zinc-800" />
        </div>
      </div>

      {/* Grid of cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="h-[140px] rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6 space-y-4"
          >
            <Skeleton className="h-4 w-1/3 bg-zinc-800" />
            <Skeleton className="h-8 w-2/3 bg-zinc-800/50" />
          </motion.div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="flex-1 space-y-4 border border-zinc-800/50 rounded-2xl p-6 bg-zinc-900/30">
        <div className="flex items-center justify-between mb-6">
           <Skeleton className="h-4 w-[100px] bg-zinc-800" />
           <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-md bg-zinc-800" />
              <Skeleton className="h-9 w-[150px] rounded-md bg-zinc-800" />
           </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-4 border-b border-zinc-800/20 last:border-0">
            <Skeleton className="h-10 w-10 rounded bg-zinc-800" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px] bg-zinc-800/60" />
              <Skeleton className="h-3 w-[200px] bg-zinc-800/30" />
            </div>
            <Skeleton className="h-8 w-[80px] rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
