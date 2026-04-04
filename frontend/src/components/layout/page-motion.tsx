"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const variants = {
  hidden: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0 },
};

export function PageMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col gap-6"
    >
      {children}
    </motion.div>
  );
}
