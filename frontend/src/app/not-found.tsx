"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Ghost } from "lucide-react";
import { NotFound3DAnimation } from "@/components/animations/not-found-3d";

export default function NotFound() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-zinc-100 overflow-hidden relative selection:bg-violet-500/30 font-sans pointer-events-none">
      
      {/* 3D Visual Background */}
      <div className="pointer-events-auto absolute inset-0 z-0">
        <NotFound3DAnimation />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center pointer-events-auto flex flex-col items-center"
      >
        <motion.div 
          variants={itemVariants}
          className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl"
        >
          <Ghost className="h-10 w-10 text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
        </motion.div>

        <motion.div variants={itemVariants} className="relative mb-6">
          <motion.h1 
            animate={{ 
              x: [0, -2, 2, -1, 1, 0],
              skewX: [0, 1, -1, 0],
              filter: ["blur(0px)", "blur(1px)", "blur(0px)"]
            }}

            transition={{ 
              duration: 0.2, 
              repeat: Infinity, 
              repeatDelay: 3,
              ease: "linear"
            }}
            className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 drop-shadow-2xl sm:text-[12rem] select-none"
          >
            404
          </motion.h1>
          <div className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-violet-600 blur-2xl animate-pulse" />
          <div className="absolute -bottom-8 -left-8 h-12 w-12 rounded-full bg-blue-600 blur-2xl animate-pulse delay-700" />
        </motion.div>
        
        <motion.h2
          variants={itemVariants}
          className="text-4xl font-bold tracking-tight text-white sm:text-5xl"
        >
          Lost in Space
        </motion.h2>
        
        <motion.p
          variants={itemVariants}
          className="mt-4 text-zinc-400 max-w-lg font-medium text-lg leading-relaxed px-6"
        >
          The coordinate you requested does not exist or was purged from the environment index. 
          Your session is currently floating in dead space.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col sm:flex-row gap-5 justify-center items-center w-full"
        >
          <Button 
            asChild 
            variant="outline" 
            className="rounded-2xl border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all h-14 px-8 text-zinc-300 hover:text-white ring-1 ring-white/5 w-full sm:w-auto"
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Retreat
            </Link>
          </Button>
          <Button 
            asChild 
            className="rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-[0_0_40px_rgba(139,92,246,0.35)] transition-all h-14 px-10 text-white font-semibold hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Dashboard Home
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Decorative floating label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 text-[10px] uppercase tracking-[0.4em] font-black text-zinc-600 select-none hidden sm:block"
      >
        Coordinate Not Found · Error Terminal 404
      </motion.div>
    </div>
  );
}

