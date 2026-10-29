"use client";

import Link from "next/link";
import Image from "next/image";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { FiMail } from "react-icons/fi";

interface PublicFooterProps {
  className?: string;
}

export function PublicFooter({ className = "" }: PublicFooterProps) {
  return (
    <footer className={`border-t border-white/[0.08] bg-[#05070a] py-8 text-xs text-zinc-400 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand Identity & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-7 w-7 rounded-lg p-0.5 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
              <Image src="/logo.png" alt="SEM" fill className="object-contain" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
              SEM
            </span>
          </Link>
          <span className="text-zinc-600 hidden sm:inline">&bull;</span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            Secure Environment Manager
          </span>
        </div>

        {/* Right: Personal Social Links */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/niranjansah87"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
            aria-label="GitHub Profile"
          >
            <FaGithub className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://www.linkedin.com/in/niranjan-sah/"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
            aria-label="LinkedIn Profile"
          >
            <FaLinkedinIn className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://x.com/niranjan8790"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
            aria-label="X Profile"
          >
            <FaXTwitter className="h-3.5 w-3.5" />
          </a>
          <a
            href="mailto:niranjansah250@gmail.com"
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white transition-all"
            aria-label="Email Niranjan Sah"
          >
            <FiMail className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Bottom Attribution Line */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 mt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
        <div>&copy; {new Date().getFullYear()} Secure Environment Manager. Open source under MIT License.</div>
        <div>
          Made with ❤️ by{" "}
          <a
            href="https://niranjansah87.com.np/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 hover:text-white font-medium underline underline-offset-4 decoration-zinc-700 hover:decoration-blue-400 transition-colors"
          >
            Niranjan Sah
          </a>
        </div>
      </div>
    </footer>
  );
}
