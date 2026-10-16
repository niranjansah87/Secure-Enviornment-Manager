"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lock,
  Check,
  Copy,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Security3DAnimation from "@/components/animations/security-3d";

const SECURITY_PILLARS = [
  {
    title: "Fernet AES-256-CBC Encryption",
    tag: "At-Rest Cryptography",
    desc: "Secrets are encrypted using 128-bit AES in CBC mode with PKCS7 padding and authenticated with a 128-bit HMAC-SHA256 signature under a 256-bit derived key. Data cannot be forged or tampered with.",
    spec: "RFC 0001 (Fernet) + PKCS#7",
  },
  {
    title: "Tamper-Evident Merkle Chains",
    tag: "Audit Immutability",
    desc: "Every write, edit, and deletion appends a cryptographically chained block containing previous hash, timestamp, actor ID, and ciphertext digest. Any unauthorized modification invalidates the audit head.",
    spec: "SHA-256 Merkle DAG",
  },
  {
    title: "Multi-Tenant Row-Level Security",
    tag: "Database Isolation",
    desc: "PostgreSQL RLS ensures that cross-tenant queries are structurally impossible at the database engine layer. Every transaction sets tenant context via session variables before executing.",
    spec: "Postgres RLS Policies",
  },
  {
    title: "Zero Plaintext Disk Persistence",
    tag: "Runtime Memory Protection",
    desc: "Our CLI and SDKs inject variables directly into process memory using virtual environment buffers. No plaintext credentials ever touch local solid-state drives or ephemeral container disks.",
    spec: "POSIX execve & Memory Pipes",
  },
];

export default function SecurityPage() {
  const [copied, setCopied] = useState(false);

  const verificationCode = `// Cryptographic Fernet Validation in @sem/crypto
import { FernetEngine } from "@sem/crypto";

const engine = new FernetEngine({
  masterKey: process.env.SEM_MASTER_KEY,
});

// Decrypt & verify HMAC signature in one atomic operation:
const plaintext = engine.decryptToken(ciphertextToken);
// Throws InvalidTokenError if payload was modified in transit or database`;

  const handleCopy = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 pt-28 pb-20">
        {/* Hero Section with Interactive 3D Vault Dial */}
        <section className="relative px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[500px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold">
                  Zero-Knowledge Security Architecture
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Defense in Depth. <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  Cryptographically Proven.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                Secure Environment Manager was built from the ground up on zero-trust principles. We
                assume every network link is monitored, every host could be compromised, and data at rest
                must remain unbreakable.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
                >
                  <span>Launch Hardened Instance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href="https://github.com/niranjansah87/Secure-Enviornment-Manager#security"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wide transition-all"
                >
                  Review Cryptographic Whitepaper
                </a>
              </div>
            </motion.div>

            {/* 3D Interactive Vault Dial Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[480px] aspect-square relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent p-1 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <Security3DAnimation />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#0c101a]/80 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-blue-400" />
                    <span>Fernet Core: Locked</span>
                  </div>
                  <span className="font-mono text-blue-400">AES-256 VERIFIED</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Security Architectural Pillars */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cryptographic Safeguards
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Every request is signed, authenticated, and logged into an immutable Merkle audit ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECURITY_PILLARS.map((p, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/[0.08] bg-[#0c101a] p-8 space-y-4 hover:border-blue-500/30 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                    {p.tag}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{p.spec}</span>
                </div>

                <h3 className="text-lg font-bold text-white">{p.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Cryptographic Verification Code Terminal */}
        <section className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c101a] p-8 lg:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400">
                  <Lock className="w-4 h-4" />
                  <span>AUDIT VERIFICATION ROUTINE</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Atomic Integrity Checks
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Decryption cannot proceed if the HMAC-SHA256 signature fails. This guarantees complete
                  protection against ciphertext tampering and Bit-Flipping attacks.
                </p>

                <div className="space-y-2 pt-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Constant-time comparison prevents timing side-channels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic IV generated uniquely per ciphertext payload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>No unauthenticated data ever decoded in memory</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/[0.1] bg-[#06080d] overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                    <span className="text-[11px] font-mono text-zinc-500">crypto-verify.ts</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
                    <code>{verificationCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

