"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { useWorkspace } from "@/context/workspace-context";

interface PublicHeaderProps {
  className?: string;
}

export function PublicHeader({ className = "" }: PublicHeaderProps) {
  const pathname = usePathname();
  const { token } = useWorkspace();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "/features" },
    { name: "Workflow", href: "/workflow" },
    { name: "Integrations", href: "/integrations" },
    { name: "Security", href: "/security" },
    { name: "Docs", href: "/docs" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#07090e]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-3.5"
          : "bg-transparent border-b border-transparent py-5"
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 shrink-0 rounded-xl p-1 bg-gradient-to-br from-blue-500/25 to-purple-500/15 border border-white/[0.1] group-hover:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all">
            <Image src="/logo.png" alt="SEM" fill className="object-contain" priority />
          </div>
          <div>
            <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-blue-400 transition-colors">
              SEM
            </span>
            <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400 leading-none">
              Secure Environment Manager
            </p>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`transition-colors relative py-1 ${
                  isActive
                    ? "text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500 after:rounded-full"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-white transition-colors p-1.5"
            aria-label="GitHub Repository"
          >
            <FaGithub className="h-4 w-4" />
          </a>
          <Link
            href={token ? "/dashboard" : "/login"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            <span>{token ? "Dashboard" : "Log in"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
