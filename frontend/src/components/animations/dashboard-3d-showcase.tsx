"use client";

import { useRef, useState, MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function Dashboard3DShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 250, y: 150 });

  // Mouse tilt motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for 3D rotation
  const springConfig = { damping: 24, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -6]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setGlarePos({ x, y });
    mouseX.set(x / rect.width - 0.5);
    mouseY.set(y / rect.height - 0.5);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="lg:col-span-7 relative w-full flex items-center justify-center py-4 select-none"
    >
      {/* Monochromatic ambient backlight */}
      <div className="absolute -inset-4 bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] rounded-full blur-3xl opacity-50 pointer-events-none -z-10" />

      {/* 3D Perspective Viewport - Compact & Balanced Footprint */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[460px] sm:max-w-[500px] cursor-pointer"
        style={{ perspective: 1300 }}
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.025, y: -5 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full flex flex-col items-center"
        >
          {/* ========================================================= */}
          {/* 1. LAPTOP SCREEN / LID (UPPER HALF)                       */}
          {/* ========================================================= */}
          <div
            className="relative w-full rounded-t-[14px] sm:rounded-t-[18px] p-1.5 sm:p-2 bg-gradient-to-b from-[#1b1f2b] via-[#121622] to-[#0a0d14] border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.9)] transition-all"
            style={{
              transform: "translateZ(16px)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Top Lid Rim Light */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />

            {/* Top Center Camera Notch */}
            <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
              <div className="w-12 sm:w-16 h-2 sm:h-2.5 bg-black rounded-b-md flex items-center justify-center border-b border-x border-white/[0.08]">
                {/* Camera lens */}
                <div className="w-1 h-1 rounded-full bg-[#151515] border border-white/20 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-blue-400/40" />
                </div>
              </div>
            </div>

            {/* Inner Screen Display (16:10 aspect ratio) */}
            <div className="relative w-full aspect-[16/10] rounded-t-[8px] sm:rounded-t-[11px] overflow-hidden bg-black border border-black">
              {/* Screen Content: Promo Video */}
              <video
                src="/home/promo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-top select-none pointer-events-none"
              />

              {/* Dynamic Glass Specular Glare tracking mouse */}
              {isHovered && (
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200 z-20"
                  style={{
                    background: `radial-gradient(350px circle at ${glarePos.x}px ${glarePos.y}px, rgba(255,255,255,0.12), transparent 70%)`,
                  }}
                />
              )}

              {/* Diagonal Gloss Sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent z-10" />

              {/* Subtle inner screen bevel shadow */}
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] z-10" />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. LAPTOP HINGE (CONNECTION POINT)                        */}
          {/* ========================================================= */}
          <div className="relative w-[65%] sm:w-[60%] h-1.5 sm:h-2 bg-gradient-to-b from-[#090b12] to-[#1a1e2a] rounded-sm border-t border-white/[0.08] shadow-inner -mt-px z-10" />

          {/* ========================================================= */}
          {/* 3. LAPTOP LOWER CHASSIS & KEYBOARD (LOWER HALF)           */}
          {/* ========================================================= */}
          <div
            className="relative w-full rounded-b-[14px] sm:rounded-b-[18px] bg-gradient-to-b from-[#181d28] via-[#121622] to-[#0c0f16] border-x border-b border-white/[0.14] px-3 sm:px-4 pt-2 pb-2.5 sm:pb-3 shadow-[0_24px_50px_rgba(0,0,0,0.9)]"
            style={{
              transform: "rotateX(42deg) translateY(-6px) translateZ(4px)",
              transformOrigin: "top center",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Keyboard Well / Recession */}
            <div className="relative w-full rounded-lg bg-[#090b10] border border-white/[0.08] p-1.5 sm:p-2 shadow-inner">
              {/* Keyboard Grid */}
              <div className="w-full space-y-0.5 sm:space-y-1">
                {/* Row 1: Function Row */}
                <div className="flex gap-0.5 sm:gap-1 h-2 sm:h-2.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={`f-${i}`}
                      className="flex-1 rounded-[1.5px] bg-[#141822] border border-white/[0.05]"
                    />
                  ))}
                </div>

                {/* Row 2: Numbers */}
                <div className="flex gap-0.5 sm:gap-1 h-2.5 sm:h-3.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={`num-${i}`}
                      className="flex-1 rounded-[1.5px] bg-[#161a26] border border-white/[0.06]"
                    />
                  ))}
                </div>

                {/* Row 3: QWERTY */}
                <div className="flex gap-0.5 sm:gap-1 h-2.5 sm:h-3.5">
                  <div className="w-[11%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={`q-${i}`}
                      className="flex-1 rounded-[1.5px] bg-[#161a26] border border-white/[0.06]"
                    />
                  ))}
                  <div className="w-[11%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                </div>

                {/* Row 4: ASDF */}
                <div className="flex gap-0.5 sm:gap-1 h-2.5 sm:h-3.5">
                  <div className="w-[14%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div
                      key={`a-${i}`}
                      className="flex-1 rounded-[1.5px] bg-[#161a26] border border-white/[0.06]"
                    />
                  ))}
                  <div className="w-[14%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                </div>

                {/* Row 5: ZXCV */}
                <div className="flex gap-0.5 sm:gap-1 h-2.5 sm:h-3.5">
                  <div className="w-[18%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={`z-${i}`}
                      className="flex-1 rounded-[1.5px] bg-[#161a26] border border-white/[0.06]"
                    />
                  ))}
                  <div className="w-[18%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                </div>

                {/* Row 6: Spacebar & Modifiers */}
                <div className="flex gap-0.5 sm:gap-1 h-3 sm:h-3.5">
                  <div className="w-[8%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  <div className="w-[8%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  <div className="w-[10%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  <div className="flex-1 rounded-[1.5px] bg-[#171c2a] border border-white/[0.08]" />
                  <div className="w-[10%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  <div className="w-[8%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                  <div className="w-[12%] rounded-[1.5px] bg-[#141822] border border-white/[0.05]" />
                </div>
              </div>
            </div>

            {/* Precision Glass Trackpad */}
            <div className="w-[38%] h-9 sm:h-12 mx-auto mt-1.5 sm:mt-2 rounded-md border border-white/[0.09] bg-gradient-to-b from-white/[0.03] to-transparent shadow-inner" />

            {/* Front Lip / Thumb Opening Notch */}
            <div className="w-10 sm:w-12 h-1 mx-auto mt-1.5 rounded-full bg-white/[0.15]" />
          </div>

          {/* Under-chassis Contact Shadow on surface */}
          <div className="w-[85%] h-4 bg-black/80 rounded-full blur-lg -mt-1.5 pointer-events-none -z-10" />
        </motion.div>
      </div>
    </motion.div>
  );
}
