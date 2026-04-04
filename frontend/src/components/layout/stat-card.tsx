"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("h-full", className)}
    >
      <Card className="h-full border-zinc-800/80 bg-[#111827] shadow-lg transition-shadow hover:shadow-xl hover:shadow-violet-500/5">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {title}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
              {value}
            </p>
            {hint && (
              <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
