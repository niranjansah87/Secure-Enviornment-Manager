"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatIso } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  variant?: "default" | "success" | "warning" | "destructive";
};

const variantMap = {
  default: "default",
  success: "success",
  warning: "warning",
  destructive: "destructive",
} as const;

export function Timeline({ items }: { items: Item[] }) {
  if (!items.length) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">No entries yet.</p>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute bottom-0 left-[7px] top-2 w-px bg-zinc-800" />
      <ul className="space-y-6">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="relative pl-8"
          >
            <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-[#0B0F19] bg-violet-500 shadow-[0_0_0_4px_rgba(124,58,237,0.15)]" />
            <div className="rounded-xl border border-zinc-800/80 bg-[#111827] p-4 transition-colors hover:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={variantMap[item.variant ?? "default"]}>
                  {item.title}
                </Badge>
                <span className="text-xs text-zinc-500">
                  {formatIso(item.timestamp)}
                </span>
              </div>
              {item.subtitle && (
                <p className="mt-2 text-sm text-zinc-400">{item.subtitle}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
