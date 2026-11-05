"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function PageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-1 flex-col gap-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
