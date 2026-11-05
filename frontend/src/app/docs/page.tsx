"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Copy,
  Check,
  Terminal,
  Shield,
  KeyRound,
  Boxes,
  Cpu,
  Layers,
  ExternalLink,
  FileCode2,
  Lock,
  GitBranch,
  RefreshCw,
  Server,
  Hash,
  CheckCircle2,
} from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

interface SectionItem {
  id: string;
  title: string;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: SectionItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { id: "introduction", title: "System Introduction" },
      { id: "threat-model", title: "Threat Model & Guarantees" },
      { id: "quickstart", title: "3-Minute Quickstart", badge: "Start Here" },
    ],
  },
  {
    group: "Cryptography",
    items: [
      { id: "envelope-encryption", title: "AES-256-GCM Envelope" },
      { id: "key-hierarchy", title: "Key Hierarchy (MEK → KEK → DEK)" },
      { id: "aad-integrity", title: "AAD & Relocation Defense" },
    ],
  },
  {
    group: "CLI Toolchain",
    items: [
      { id: "cli-install", title: "Installation & Setup" },
      { id: "cli-auth", title: "Authentication (sem auth)" },
      { id: "cli-config", title: "Configuration (sem config)" },
      { id: "cli-secrets", title: "Managing Secrets (sem secrets)" },
      { id: "cli-run", title: "In-Memory Run (sem run)", badge: "Zero-Disk" },
      { id: "cli-env", title: "Environment Sync & Pull (sem env)" },
      { id: "cli-audit-ws", title: "Audit & Real-Time Events (sem ws)" },
    ],
  },
  {
    group: "Developer SDK",
    items: [
      { id: "sdk-setup", title: "TypeScript SDK (@sem/sdk)" },
      { id: "sdk-usage", title: "Secret Retrieval & Caching" },
      { id: "sdk-bulk", title: "Bulk Updates & Rollbacks" },
    ],
  },
  {
    group: "API Reference",
    items: [
      { id: "api-auth", title: "Authentication Headers" },
      { id: "api-endpoints", title: "Core Endpoints Matrix" },
      { id: "api-errors", title: "Error Codes & Handling" },
    ],
  },
  {
    group: "Governance & Operations",
    items: [
      { id: "rbac-matrix", title: "Role-Based Access (RBAC)" },
      { id: "self-hosting", title: "Docker & Self-Hosting" },
      { id: "key-rotation", title: "Master Key Rotation Protocol" },
    ],
  },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl border border-white/[0.08] bg-[#0c101a] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] text-[11px] text-zinc-400 font-mono">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" | "PUT" | "DELETE" }) {
  const colors = {
    GET: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    DELETE: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${colors[method]}`}>
      {method}
    </span>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>("introduction");
  const [searchQuery, setSearchQuery] = useState("");
  const [sdkTab, setSdkTab] = useState<"typescript" | "cli" | "curl">("typescript");

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return NAV_GROUPS;
    const query = searchQuery.toLowerCase();
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.title.toLowerCase().includes(query) || group.group.toLowerCase().includes(query)
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-zinc-200 selection:bg-blue-500/30 font-sans antialiased">
      <PublicHeader />

      {/* Hero Banner with Search */}
      <section className="pt-28 pb-12 border-b border-white/[0.08] bg-gradient-to-b from-[#0a0f1d] via-[#07090e] to-[#07090e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[11px] font-mono font-semibold mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>SEM v2.0 Architecture &amp; Developer Guide</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Engineering Documentation
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mt-2 leading-relaxed">
                Zero-knowledge environment secret lifecycle management. Complete reference for cryptographic guarantees, CLI commands, programmatic SDKs, and REST APIs.
              </p>
            </div>

            {/* Quick Search */}
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics, commands, APIs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0c101a] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Documentation Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Navigation Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-3 space-y-6 text-xs select-none scrollbar-thin scrollbar-thumb-zinc-800">
            {filteredGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <h2 className="px-3 text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-2">
                  {group.group}
                </h2>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors font-medium ${
                          isActive
                            ? "bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-white/[0.08] px-3">
              <a
                href="https://github.com/niranjansah87/Secure-Enviornment-Manager"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <FaGithub className="w-4 h-4" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 ml-auto text-zinc-400" />
              </a>
            </div>
          </aside>

          {/* Right Main Content Column */}
          <main className="lg:col-span-9 space-y-16 text-sm leading-relaxed text-zinc-300">
            
            {/* 1. Introduction */}
            <section id="introduction" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Boxes className="w-4 h-4" />
                <span>System Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Secure Environment Manager Overview
              </h2>
              <p>
                <strong>Secure Environment Manager (SEM)</strong> is a centralized, zero-knowledge secrets management system engineered for high-security multi-tenant infrastructure. It eliminates unencrypted <code className="text-blue-300 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">.env</code> files from developer workstations, container images, and source control repositories.
              </p>
              <p>
                Unlike generic key-value vaults that store plaintext strings in memory or rely on database-level transparent disk encryption alone, SEM utilizes a deterministic <strong>three-tier envelope encryption architecture</strong> implemented in <code className="text-blue-300 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">@sem/crypto</code> with authenticated data binding. Every single variable is isolated by project namespace and environment tier.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span>Zero Plaintext at Rest</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Database operators and PostgreSQL logs see only AES-256-GCM ciphertexts with per-record authenticated tags.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>In-Memory Injection</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    The CLI spawns your application subprocess with decrypted environment variables injected into memory, touching zero files.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Hash className="w-4 h-4 text-purple-400" />
                    <span>Relocation Proof</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    AAD explicitly binds ciphertexts to project ID, environment ID, key name, and version number. Transplant attacks fail.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Threat Model */}
            <section id="threat-model" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Security Assurance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Threat Model &amp; Cryptographic Guarantees
              </h2>
              <p>
                SEM is designed against an active adversarial model where the database storage, communication pipes, or lower-privilege users may be compromised:
              </p>
              
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c101a]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/[0.06] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Threat Vector</th>
                      <th className="py-3 px-4">Adversary Capability</th>
                      <th className="py-3 px-4">SEM Defense Mechanism</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Database Dump Exfiltration</td>
                      <td className="py-3 px-4 text-zinc-400">Full read access to PostgreSQL tables and WAL backups.</td>
                      <td className="py-3 px-4 text-emerald-400">
                        AES-256-GCM encrypted values. Master key is not stored in the database.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Ciphertext Transplant Attack</td>
                      <td className="py-3 px-4 text-zinc-400">Moving a staging ciphertext row into a production environment row.</td>
                      <td className="py-3 px-4 text-emerald-400">
                        AAD authentication tag verification failure (<code className="font-mono text-zinc-300">TAG_LEN: 16B</code>).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Developer Disk Leaks</td>
                      <td className="py-3 px-4 text-zinc-400">Accidental commits of <code className="font-mono text-zinc-300">.env</code> or OS cache scraping.</td>
                      <td className="py-3 px-4 text-emerald-400">
                        <code className="font-mono text-zinc-300">sem run exec</code> executes via OS pipe directly to <code className="font-mono text-zinc-300">process.env</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Audit Trail Forgery</td>
                      <td className="py-3 px-4 text-zinc-400">Attempting to edit or purge historical secret access records.</td>
                      <td className="py-3 px-4 text-emerald-400">
                        Append-only tamper-evident audit ledger with actor IP, UA, and mutation hashes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Quickstart */}
            <section id="quickstart" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Getting Started</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                3-Minute Developer Quickstart
              </h2>
              <p>
                Get your local development or CI/CD workflow connected to SEM in three commands.
              </p>

              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</span>
                    <span className="text-white font-semibold">Install CLI Toolchain</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code={`# Global npm package
npm install -g @sem-org/sem-cli

# Verify installation
sem --version
# => SEM CLI v1.0.0`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">2</span>
                    <span className="text-white font-semibold">Authenticate and Set Context</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code={`# Interactive login against your SEM cluster (defaults to http://localhost:3001)
sem auth login

# Set your active namespace and target environment
sem config set namespace core-backend
sem config set environment development`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">3</span>
                    <span className="text-white font-semibold">Inject Secrets In-Memory Without Writing to Disk</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code={`# Run your application process directly
sem run exec development -- pnpm start

# Or test with an inline echo (notice no file is generated)
sem run exec development -- node -e "console.log('DB URL:', process.env.DATABASE_URL)"`}
                  />
                </div>
              </div>
            </section>

            {/* 4. Cryptography: Envelope Encryption */}
            <section id="envelope-encryption" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Cryptographic Core</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                AES-256-GCM Envelope Encryption
              </h2>
              <p>
                SEM implements true cryptographic envelope encryption in <code className="text-blue-300 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">packages/crypto/src/envelope.ts</code> using Node.js native <code className="text-zinc-200 font-mono">crypto.createCipheriv(&apos;aes-256-gcm&apos;)</code>.
              </p>

              {/* Architecture Diagram */}
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#090d16] space-y-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Key Wrapping &amp; Encryption Hierarchy
                </span>
                <div className="font-mono text-xs text-zinc-300 leading-relaxed bg-[#05070c] p-4 rounded-xl border border-white/[0.06] overflow-x-auto">
{`┌────────────────────────────────────────────────────────┐
│  Master Encryption Key (MEK)                           │  [SEM_MASTER_KEY in ENV / KMS]
│  256-bit Key (32 bytes base64 / Hardware HSM)          │
└───────────────────────────┬────────────────────────────┘
                            │ (wraps via AES-256-GCM)
┌───────────────────────────▼────────────────────────────┐
│  Key Encryption Key (KEK)                              │  [Per-Project Scope]
│  Derived per project namespace                         │
└───────────────────────────┬────────────────────────────┘
                            │ (wraps via AES-256-GCM)
┌───────────────────────────▼────────────────────────────┐
│  Data Encryption Key (DEK)                             │  [Per-Environment Scope]
│  Dedicated 32-byte key per environment tier            │
└───────────────────────────┬────────────────────────────┘
                            │ (encrypts payload + binds AAD)
┌───────────────────────────▼────────────────────────────┐
│  Ciphertext + 12B Random Nonce + 16B GCM Auth Tag      │  [Stored in PostgreSQL]
│  AAD: sem:secret:{id}:{env}:{key}:v{ver}:dek{dekVer}   │
└────────────────────────────────────────────────────────┘`}
                </div>
              </div>

              <div id="key-hierarchy" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-lg font-bold text-white">Three-Tier Key Hierarchy Explained</h3>
                <ul className="space-y-3 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-mono font-bold">1.</span>
                    <div>
                      <strong className="text-white">Master Encryption Key (MEK):</strong> The root authority. Passed via <code className="text-blue-300 font-mono">SEM_MASTER_KEY</code> (base64-encoded 32-byte key generated via <code className="text-zinc-200 font-mono">openssl rand -base64 32</code> or <code className="text-zinc-200 font-mono">pnpm keys:generate</code>). It never touches database storage and resides strictly in API and worker process memory.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-mono font-bold">2.</span>
                    <div>
                      <strong className="text-white">Project Key Encryption Key (KEK):</strong> Unique 32-byte key assigned to each project. Wrapped by the MEK. This ensures that compromising a project key exposes only that project.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-mono font-bold">3.</span>
                    <div>
                      <strong className="text-white">Environment Data Encryption Key (DEK):</strong> Dedicated key for each environment tier (e.g. production, staging). Wrapped by the project KEK. Re-keyed independently during key rotations without needing to re-encrypt other environments.
                    </div>
                  </li>
                </ul>
              </div>

              <div id="aad-integrity" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-lg font-bold text-white">Additional Authenticated Data (AAD) &amp; Relocation Defense</h3>
                <p>
                  A common vulnerability in naive AES vaults is the <em>ciphertext transplant attack</em>: an attacker copies an encrypted value from a low-security environment (<code className="font-mono text-zinc-300">development</code>) into a high-security row (<code className="font-mono text-zinc-300">production</code>). If keys are reused or decrypted identically, the value decodes.
                </p>
                <p>
                  SEM binds the GCM authentication tag to a deterministic AAD string generated at encryption time:
                </p>
                <CodeBlock
                  language="typescript"
                  code={`// packages/crypto/src/envelope.ts
export function buildSecretAad(params: {
  secretId: string;
  environmentId: string;
  key: string;
  version: number;
  dekVersion: number;
}): Buffer {
  return Buffer.from(
    \`sem:secret:\${params.secretId}:\${params.environmentId}:\${params.key}:v\${params.version}:dek\${params.dekVersion}\`,
    'utf8'
  );
}`}
                />
                <p className="text-xs text-zinc-400">
                  During decryption, if the secret ID, environment ID, key name, or version differs by even a single bit from the intended target, the GCM tag authentication throws an unrecoverable validation error, blocking any forgery.
                </p>
              </div>
            </section>

            {/* 5. CLI Toolchain */}
            <section id="cli-install" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Terminal className="w-4 h-4" />
                <span>CLI Reference</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Command-Line Interface (<code className="text-blue-400">sem</code>)
              </h2>
              <p>
                The official SEM CLI (<code className="text-zinc-200 font-mono">@sem-org/sem-cli</code>) provides full developer and CI/CD operations with formatted output, JSON piping, and interactive prompts.
              </p>

              <div id="cli-auth" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span>Authentication Commands (<code className="text-blue-300">sem auth</code>)</span>
                </h3>
                <CodeBlock
                  language="bash"
                  code={`# Interactive login with username & password
sem auth login

# Login with explicit password and namespace
sem auth login -p "MySecurePassword" -n core-api -e production

# Inspect current authentication status & token expiration
sem auth status

# Refresh active JWT access token using stored refresh token
sem auth refresh

# Terminate session and purge ~/.sem/config.json
sem auth logout`}
                />
              </div>

              <div id="cli-config" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>Configuration Context (<code className="text-cyan-300">sem config</code>)</span>
                </h3>
                <CodeBlock
                  language="bash"
                  code={`# Interactive initialization wizard
sem config init

# Display active context, server URL, and token status
sem config show

# Set active context variables (keys: baseurl, namespace, environment)
sem config set baseurl http://localhost:3001
sem config set namespace backend-core
sem config set environment production

# Reset and clear local configuration file
sem config clear`}
                />
              </div>

              <div id="cli-secrets" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Managing Secrets (<code className="text-emerald-300">sem secrets</code>)</span>
                </h3>
                <CodeBlock
                  language="bash"
                  code={`# List secrets (supports formats: table, json, plain)
sem secrets list -n backend-core -e production --format table

# Retrieve specific decrypted secret value to stdout
sem secrets get DATABASE_URL -n backend-core -e production

# Set secret value interactively (prompts for hidden input if value omitted)
sem secrets set STRIPE_WEBHOOK_SECRET "whsec_abc123"

# Set secret from a file (useful for PEM certificates or multiline JSON)
sem secrets set TLS_CERT --from-file ./cert.pem

# Delete a secret (prompts for confirmation, or use --force)
sem secrets delete DEPRECATED_KEY --force

# Bulk upsert or delete using a standard .env file
sem secrets bulk upsert -f .env.production
sem secrets bulk delete -f .env.cleanup`}
                />
              </div>

              <div id="cli-run" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Zero-Disk Process Execution (<code className="text-purple-300">sem run</code>)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Executes binaries with encrypted secrets fetched directly from the gateway, decrypted into memory, and injected into the subprocess environment table.
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Basic execution: sem run exec [environment] -- <command>
sem run exec staging -- npm run build

# Docker container run with in-memory secrets
sem run exec production -- docker compose up -d

# Silent mode (suppresses SEM logging, passing only command stdout)
sem run exec production --silent -- python app.py

# Output formatted .env directly to stdout without disk writes
sem run exec development --env-only

# Export shell statements (export KEY=VALUE)
sem run export production --prefix APP_`}
                />
              </div>

              <div id="cli-env" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-amber-400" />
                  <span>Environment Sync &amp; Export (<code className="text-amber-300">sem env</code>)</span>
                </h3>
                <CodeBlock
                  language="bash"
                  code={`# List all environments in the namespace
sem env list -n backend-core

# Pull environment secrets as .env file
sem env pull production -o .env.local

# View environment metadata and secret count
sem env info production`}
                />
              </div>

              <div id="cli-audit-ws" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Audit, Sessions &amp; Real-Time WebSockets (<code className="text-blue-300">sem audit</code>, <code className="text-blue-300">sem ws</code>)</span>
                </h3>
                <CodeBlock
                  language="bash"
                  code={`# View audit ledger logs with pagination
sem audit logs --limit 50 --page 1

# Manage active user sessions
sem audit sessions
sem audit revoke-session <session-id>

# Manage registered device tokens
sem audit devices
sem audit revoke-device <device-id>

# Subscribe to real-time environment events via WebSocket
sem ws subscribe production -n backend-core

# Stream real-time events with optional filter (secret, session, device)
sem ws events production --filter secret`}
                />
              </div>
            </section>

            {/* 6. Developer SDK */}
            <section id="sdk-setup" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <FileCode2 className="w-4 h-4" />
                <span>Programmatic SDK</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                TypeScript / Node.js SDK (<code className="text-blue-400">@sem/sdk</code>)
              </h2>
              <p>
                The official SDK provides complete TypeScript bindings, automatic JWT renewal, and resilient API interactions.
              </p>

              {/* Code Tab Switcher */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c101a] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <button
                    onClick={() => setSdkTab("typescript")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      sdkTab === "typescript" ? "bg-blue-600/20 text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    TypeScript SDK
                  </button>
                  <button
                    onClick={() => setSdkTab("cli")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      sdkTab === "cli" ? "bg-blue-600/20 text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    CLI Equivalence
                  </button>
                  <button
                    onClick={() => setSdkTab("curl")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      sdkTab === "curl" ? "bg-blue-600/20 text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Raw HTTP / cURL
                  </button>
                </div>

                <div className="p-4">
                  {sdkTab === "typescript" && (
                    <div id="sdk-usage" className="space-y-3">
                      <CodeBlock
                        language="typescript"
                        code={`import { SemClient } from "@sem/sdk";

// Initialize client with API key or username/password
const client = new SemClient({
  baseUrl: process.env.SEM_API_URL || "https://sem.internal:3001",
  apiKey: process.env.SEM_SERVICE_KEY, // format: sem_<id>_<secret>
});

async function bootstrap() {
  const projectId = "proj_backend_core";
  const environmentId = "env_production";

  // 1. Fetch single decrypted secret
  const dbSecret = await client.getSecret(projectId, environmentId, "DATABASE_URL");
  console.log("DB Port:", dbSecret.value);

  // 2. Upsert or update a secret
  await client.upsertSecret(projectId, environmentId, "CACHE_TTL", {
    value: "3600",
    description: "Redis caching TTL in seconds",
  });

  // 3. Compare environment drift
  const diff = await client.compareEnvironments(projectId, "env_staging", "env_production");
  console.log("Missing in prod:", diff.missingInTarget);
}

bootstrap().catch(console.error);`}
                      />
                    </div>
                  )}

                  {sdkTab === "cli" && (
                    <CodeBlock
                      language="bash"
                      code={`# Corresponding CLI operations
sem secrets get DATABASE_URL -n proj_backend_core -e env_production

sem secrets set CACHE_TTL "3600" -n proj_backend_core -e env_production

sem env diff env_staging env_production -n proj_backend_core`}
                    />
                  )}

                  {sdkTab === "curl" && (
                    <CodeBlock
                      language="bash"
                      code={`# Fetch decrypted secret value via REST API
curl -X GET "https://sem.internal:3001/api/v1/projects/proj_backend_core/environments/env_production/secrets/DATABASE_URL/value" \\
  -H "Authorization: Bearer <jwt_access_token>" \\
  -H "Content-Type: application/json"`}
                    />
                  )}
                </div>
              </div>

              <div id="sdk-bulk" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white">Bulk Environment Operations</h3>
                <p className="text-xs text-zinc-400">
                  Bulk sync replacements ensure atomic transaction boundaries. If any secret fails validation, the entire transaction rolls back.
                </p>
                <CodeBlock
                  language="typescript"
                  code={`await client.bulkReplaceSecrets(projectId, environmentId, {
  secrets: [
    { key: "API_GATEWAY_URL", value: "https://api.internal" },
    { key: "RATE_LIMIT_MAX", value: "1000" },
    { key: "ENABLE_TRACING", value: "true" },
  ],
  comment: "Deploy release v2.4.0 configuration update",
});`}
                />
              </div>
            </section>

            {/* 7. API Reference */}
            <section id="api-auth" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>REST API Specification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                HTTP API Matrix &amp; Endpoints
              </h2>
              <p>
                The Fastify/NestJS backend serves API v1 routes on port <code className="text-blue-300 font-mono">3001</code>. All requests require valid authentication and enforce tenant organization isolation.
              </p>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2 text-xs">
                <div className="font-semibold text-white font-mono">Request Headers</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-400">
                  <div>
                    <code className="text-blue-300 font-mono">Authorization: Bearer &lt;token&gt;</code>
                    <p className="text-[11px] mt-0.5">JWT access token issued by <code className="text-zinc-300 font-mono">/api/v1/auth/login</code></p>
                  </div>
                  <div>
                    <code className="text-blue-300 font-mono">X-API-Key: sem_&lt;id&gt;_&lt;secret&gt;</code>
                    <p className="text-[11px] mt-0.5">Scoped programmatic service token for CI/CD runners</p>
                  </div>
                </div>
              </div>

              <div id="api-endpoints" className="space-y-4 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white">Core Endpoints</h3>
                <div className="space-y-3">
                  
                  {/* Endpoint 1 */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="POST" />
                        <span className="font-semibold text-white">/api/v1/auth/login</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">User / Service Login</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Authenticates credentials with Argon2id hash verification and issues access &amp; refresh JWT tokens.
                    </p>
                  </div>

                  {/* Endpoint 2 */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">List Environment Keys</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Returns a list of secret metadata, versions, and update timestamps (values masked). Requires scope <code className="text-blue-300 font-mono">secrets:read</code>.
                    </p>
                  </div>

                  {/* Endpoint 3 */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets/:key/value</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Decrypted Secret Value</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Unwraps environment DEK with project KEK, decrypts value, and logs an access audit record. Requires scope <code className="text-blue-300 font-mono">secrets:read</code>.
                    </p>
                  </div>

                  {/* Endpoint 4 */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="PUT" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets/:key</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Create / Update Secret</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Encrypts plaintext under AES-256-GCM with fresh nonce and AAD. Increments version and appends audit log. Requires scope <code className="text-blue-300 font-mono">secrets:write</code>.
                    </p>
                  </div>

                  {/* Endpoint 5 - Bulk Replace */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="POST" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets/bulk</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Atomic Bulk Upsert</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Atomically upserts an array of secrets in a single database transaction. Requires scope <code className="text-blue-300 font-mono">secrets:write</code>.
                    </p>
                  </div>

                  {/* Endpoint 6 - Export */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets/export?format=(env|json|yaml|docker)</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Export Secrets</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Exports all secrets in specified format. Requires scope <code className="text-blue-300 font-mono">secrets:export</code>.
                    </p>
                  </div>

                  {/* Endpoint 7 - Compare Environments */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:id/compare/:targetId</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Compare Environments</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Computes drift, missing keys, and version divergences between source and target environments. Requires scope <code className="text-blue-300 font-mono">secrets:read</code>.
                    </p>
                  </div>

                  {/* Endpoint 8 - Rollback Secret */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="POST" />
                        <span className="font-semibold text-white">/api/v1/projects/:projectId/environments/:environmentId/secrets/:key/rollback/:version</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Rollback Secret Version</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Rolls back a secret to a previous version snapshot and records audit history. Requires scope <code className="text-blue-300 font-mono">secrets:write</code>.
                    </p>
                  </div>

                  {/* Endpoint 9 - Audit */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/api/v1/audit</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Query Audit Ledger</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Returns chronological mutation log entries filtered by <code className="font-mono text-zinc-300">action</code>, <code className="font-mono text-zinc-300">actor_id</code>, <code className="font-mono text-zinc-300">resource_type</code>, <code className="font-mono text-zinc-300">from</code>, <code className="font-mono text-zinc-300">to</code>, <code className="font-mono text-zinc-300">limit</code>, and <code className="font-mono text-zinc-300">offset</code>. Requires scope <code className="text-blue-300 font-mono">audit:read</code>.
                    </p>
                  </div>

                  {/* Endpoint 10 - Liveness & Readiness */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <MethodBadge method="GET" />
                        <span className="font-semibold text-white">/healthz &amp; /readyz</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Liveness &amp; Readiness Probes</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      <code className="text-zinc-200 font-mono">/healthz</code> returns API uptime and liveness status. <code className="text-zinc-200 font-mono">/readyz</code> actively verifies PostgreSQL database connection and Redis cache responsiveness. Prometheus metrics available at <code className="text-zinc-200 font-mono">/metrics</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div id="api-errors" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white">Standard Error Response Format</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "success": false,
  "statusCode": 403,
  "error": "Forbidden",
  "message": "User lacks permissions to read decrypted production secret 'DATABASE_URL'",
  "timestamp": "2026-10-29T12:00:00.000Z",
  "path": "/api/v1/projects/billing/environments/production/secrets/DATABASE_URL/value"
}`}
                />
              </div>
            </section>

            {/* 8. RBAC Matrix */}
            <section id="rbac-matrix" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Governance &amp; RBAC</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Role-Based Access Control Matrix
              </h2>
              <p>
                SEM enforces deterministic role boundaries. User roles (<code className="text-blue-300 font-mono">admin</code>, <code className="text-blue-300 font-mono">developer</code>, <code className="text-blue-300 font-mono">viewer</code>) are evaluated strictly within the context of the user&apos;s active organization tenant. Machine-to-machine integrations authenticate with scoped API keys.
              </p>

              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c101a]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/[0.06] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Permission Capability</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Developer</th>
                      <th className="py-3 px-4">Viewer</th>
                      <th className="py-3 px-4">API Key (Scoped)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Manage Users &amp; Org Settings</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">admin:users</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Create / Delete Projects &amp; Envs</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">admin:projects, admin:environments</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Read Decrypted Secret Values</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; Masked Only</td>
                      <td className="py-3 px-4 text-blue-400">secrets:read</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Write &amp; Upsert Secrets</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; Read-Only</td>
                      <td className="py-3 px-4 text-blue-400">secrets:write</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Delete Secrets</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">secrets:delete</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Export Environment Configurations</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">secrets:export</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Secret Version History &amp; Rollback</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">history:read, secrets:write</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Query Audit Logs</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; Self Actions Only</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Org-Wide</td>
                      <td className="py-3 px-4 text-blue-400">audit:read</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">Manage &amp; Issue API Keys</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">&#10003; Full</td>
                      <td className="py-3 px-4 text-blue-400">Grant Own Scopes</td>
                      <td className="py-3 px-4 text-zinc-500">&#10007; None</td>
                      <td className="py-3 px-4 text-blue-400">api-keys:manage</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c101a] text-xs space-y-2">
                <span className="font-semibold text-white font-mono">Supported API Key Scopes (11 Scopes)</span>
                <p className="text-zinc-400 leading-relaxed">
                  Programmatic tokens can be scoped down to: <code className="text-blue-300 font-mono">secrets:read</code>, <code className="text-blue-300 font-mono">secrets:write</code>, <code className="text-blue-300 font-mono">secrets:delete</code>, <code className="text-blue-300 font-mono">secrets:export</code>, <code className="text-blue-300 font-mono">history:read</code>, <code className="text-blue-300 font-mono">audit:read</code>, <code className="text-blue-300 font-mono">analytics:read</code>, <code className="text-blue-300 font-mono">api-keys:manage</code>, <code className="text-blue-300 font-mono">admin:users</code>, <code className="text-blue-300 font-mono">admin:projects</code>, <code className="text-blue-300 font-mono">admin:environments</code>.
                </p>
              </div>
            </section>

            {/* 9. Self-Hosting */}
            <section id="self-hosting" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-12">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                <Server className="w-4 h-4" />
                <span>Infrastructure Operations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Self-Hosting &amp; Production Deployment
              </h2>
              <p>
                SEM is fully self-hostable on any Docker, Kubernetes, or Linux server. The entire stack consists of Fastify API (@sem/api), Next.js Dashboard (frontend), BullMQ Background Worker (@sem/worker), PostgreSQL, and Redis.
              </p>

              <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-white">1. Generate Cryptographic Keys</h3>
                <p className="text-xs text-zinc-400">
                  Generate the required 256-bit base64 master key and token HMAC key, or run the monorepo helper:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Automated generator for all cryptographic keys
pnpm keys:generate

# Or generate manually with OpenSSL (base64-encoded 32-byte key)
openssl rand -base64 32
# => 7Z3yQf+N2bX3/9xK4mP2vL0wR1aT8eY5gH7jK9mN1q0=`}
                />
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="text-base font-bold text-white">2. Production docker-compose.yml</h3>
                <CodeBlock
                  language="yaml"
                  code={`version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: sem
      POSTGRES_USER: sem
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sem -d sem"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass \${REDIS_PASSWORD} --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  sem-api:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://sem:\${POSTGRES_PASSWORD}@postgres:5432/sem
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379
      SEM_MASTER_KEY: \${SEM_MASTER_KEY}
      SEM_TOKEN_HMAC_KEY: \${SEM_TOKEN_HMAC_KEY}
      SEM_MASTER_TOKEN: \${SEM_MASTER_TOKEN}
      JWT_PRIVATE_KEY: \${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: \${JWT_PUBLIC_KEY}
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "3001:3001"

  sem-worker:
    build:
      context: .
      dockerfile: worker/Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sem:\${POSTGRES_PASSWORD}@postgres:5432/sem
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379
      SEM_MASTER_KEY: \${SEM_MASTER_KEY}
      SEM_DEK_ROTATION_DAYS: 90

  sem-web:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      PORT: 3000
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:`}
                />
              </div>

              <div id="key-rotation" className="space-y-3 pt-4 scroll-mt-28">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>Automated Key Rotation Architecture</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  SEM incorporates multi-layer key lifecycle management:
                </p>
                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">1. Automated DEK Rotation Worker</strong>
                    The background worker runs scheduled maintenance (<code className="text-blue-300 font-mono">sem-queue-maintenance</code>) that inspects active environment Data Encryption Keys older than <code className="text-zinc-200 font-mono">SEM_DEK_ROTATION_DAYS</code> (default: 90 days). It unwraps the project KEK, provisions a new DEK, re-encrypts all secrets in the environment with fresh 12-byte random nonces and updated AAD tags inside an atomic PostgreSQL transaction. Zero downtime is incurred.
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <strong className="text-white block mb-1">2. Zero Secret Re-encryption on KEK/MEK Updates</strong>
                    Because secrets are encrypted with environment DEKs, rotating the root Master Encryption Key (MEK) only requires re-wrapping the Project KEK records. Individual secret values and ciphertexts never need to be touched.
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
