"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScenicBannerProps {
  className?: string;
  children?: React.ReactNode;
  height?: string;
}

export function ScenicBanner({
  className,
  children,
  height = "h-48 md:h-56",
}: ScenicBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6 group",
        height,
        className
      )}
    >
      {/* Background Mountain Vista Image with gentle scale */}
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/admin_header_image.png"
          alt="Atmospheric Landscape"
          fill
          priority
          className="object-cover object-center filter brightness-[0.82] contrast-[1.08] transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {/* Cinematic Gradient Overlays to melt perfectly into dark obsidian UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/85 via-transparent to-[#07090e]/85" />
        <div className="absolute inset-0 bg-blue-950/15 mix-blend-color" />
        {/* Ambient breathing light shimmer */}
        <div className="absolute -top-1/2 left-1/4 h-full w-1/2 bg-blue-500/10 blur-[80px] pointer-events-none rounded-full animate-pulse" />
      </motion.div>

      {/* Content overlay */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-8">
        {children}
      </div>
    </motion.div>
  );
}

