"use client";

import { useRef, useState, MouseEvent } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function Security3DCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 200, y: 200 });

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth responsive spring physics for 3D tilt
  const springConfig = { damping: 20, stiffness: 220 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setGlarePos({ x: mouseX, y: mouseY });
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="lg:col-span-6 relative w-full select-none"
    >
      {/* Monochromatic ambient backlight */}
      <div className="absolute -inset-3 bg-gradient-to-r from-white/[0.02] via-white/[0.07] to-white/[0.02] rounded-3xl blur-2xl opacity-60 pointer-events-none -z-10" />

      {/* 3D Tilt Card */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          transformPerspective: 1000,
        }}
        whileHover={{
          scale: 1.02,
          y: -4,
          transition: { duration: 0.25 },
        }}
        className="relative rounded-3xl overflow-hidden border border-white/[0.14] bg-[#0c101a] shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_25px_rgba(255,255,255,0.03)] hover:border-white/35 transition-all group cursor-pointer h-[380px] md:h-[440px]"
      >
        {/* Dynamic Monochromatic White Specular Glare */}
        {isHovered && (
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl opacity-100 transition-opacity duration-200 z-20"
            style={{
              background: `radial-gradient(420px circle at ${glarePos.x}px ${glarePos.y}px, rgba(255,255,255,0.12), transparent 70%)`,
            }}
          />
        )}

        {/* Cinematic Futuristic Data Vault Image */}
        <Image
          src="/Cinematic_Futuristic_Data_Vault.png"
          alt="Futuristic Data Vault"
          fill
          priority
          className="object-cover object-center filter contrast-[1.08] brightness-[0.95] select-none pointer-events-none"
        />

        {/* Subtle bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e]/80 via-transparent to-transparent pointer-events-none z-10" />

        {/* Top Rim Light */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:via-white/60 transition-all duration-300 pointer-events-none z-10" />
      </motion.div>
    </motion.div>
  );
}

