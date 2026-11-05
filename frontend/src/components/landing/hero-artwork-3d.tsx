"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Lock } from "lucide-react";

export default function HeroArtwork3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  // Mouse tilt tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for subtle, high-end 3D tilt
  const springConfig = { damping: 30, stiffness: 100, mass: 0.8 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig);
  const translateZ = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);

  useEffect(() => {
    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Check if cursor is roughly within the hero area
      if (
        e.clientX >= rect.left - 100 &&
        e.clientX <= rect.right + 100 &&
        e.clientY >= rect.top - 100 &&
        e.clientY <= rect.bottom + 100
      ) {
        setIsHovered(true);
        const xPercent = (e.clientX - rect.left) / rect.width;
        const yPercent = (e.clientY - rect.top) / rect.height;

        mouseX.set(xPercent - 0.5);
        mouseY.set(yPercent - 0.5);
        setGlare({
          x: Math.max(0, Math.min(100, xPercent * 100)),
          y: Math.max(0, Math.min(100, yPercent * 100)),
        });
      } else {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-0 bottom-0 w-full max-w-[1050px] xl:max-w-[1220px] z-0 overflow-hidden pointer-events-none select-none"
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          translateZ,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full"
      >
        {/* Native Scale Dashboard Screenshot */}
        <div className="relative w-full h-full">
          <Image
            src="/home/hero.png"
            alt="Secure Environment Manager Workspace"
            fill
            priority
            className="object-contain object-right-top select-none opacity-85 transition-opacity duration-300"
          />

          {/* Dynamic Interactive Glare Sheen following cursor */}
          {isHovered && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(650px circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.08), transparent 60%)`,
                transform: "translateZ(15px)",
              }}
            />
          )}

          {/* Subtle Ambient Depth Lighting behind the dashboard */}
          <div
            className="absolute top-1/4 right-1/4 w-[500px] h-[350px] bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent blur-[100px] pointer-events-none -z-10"
            style={{ transform: "translateZ(-40px)" }}
          />

          {/* Floating 3D Depth Card 1: Live Status */}
          <motion.div
            className="absolute top-[22%] right-[12%] hidden xl:flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-white/[0.12] bg-[#0c101a]/85 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
            style={{
              transform: "translateZ(45px)",
              transformStyle: "preserve-3d",
            }}
            animate={{
              y: [-3, 3, -3],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-[11px] font-semibold text-emerald-300">
              In Sync
            </span>
            <span className="text-zinc-600">|</span>
            <span className="font-mono text-[10px] text-zinc-400">production</span>
          </motion.div>

          {/* Floating 3D Depth Card 2: Security Verification */}
          <motion.div
            className="absolute top-[48%] right-[22%] hidden 2xl:flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-sky-500/25 bg-[#0a0f1d]/85 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
            style={{
              transform: "translateZ(60px)",
              transformStyle: "preserve-3d",
            }}
            animate={{
              y: [3, -3, 3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-[11px] font-semibold text-sky-200">
              AES-256-CBC
            </span>
            <span className="text-zinc-600">|</span>
            <span className="font-mono text-[10px] text-zinc-400">HMAC Signed</span>
          </motion.div>

          {/* Seamless Edge Blending Gradients (Exact Match to Original Design) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/60 to-transparent w-[55%] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#07090e] to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#07090e] via-[#07090e]/85 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}

