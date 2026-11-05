<div align="center">

<a href="https://github.com/niranjansah87/Secure-Enviornment-Manager">
  <img src="./screenshots/logo.png" alt="Secure Environment Manager (SEM) Logo" width="140" />
</a>

# 🔒 Secure Environment Manager (SEM)

### The Production-Grade, Self-Hosted Developer Secrets Infrastructure

[![CI](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/ci.yml)
[![Security Scan](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/security.yml/badge.svg)](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-v2-EF4444.svg)](https://turbo.build/)

<p align="center">
  <a href="#-the-v2-redesign">The Redesign</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-visual-tour">Visual Tour</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-cli-usage">CLI</a> •
  <a href="#-sdk-integration">SDK</a> •
  <a href="#-security-model">Security Model</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## 💡 Overview

**Secure Environment Manager (SEM)** is an enterprise-grade, self-hosted developer secrets management and configuration distribution platform. Built as a sovereign alternative to proprietary cloud secrets managers (such as Doppler, HashiCorp Vault, and AWS Secrets Manager), SEM gives engineering teams 100% control over their cryptographic keys, database storage, and access policies.

With **version 2.0**, SEM has undergone a **complete architectural overhaul of both the backend and frontend**, establishing a unified Turborepo monorepo with authenticated envelope encryption, real-time WebSocket sync, cross-platform CLI, type-safe SDK, and a dark-mode developer experience.

---

## ⚡ The Redesign: What's New in SEM v2

SEM was rebuilt from the ground up to replace legacy, single-node Python prototypes with a scalable, modern microservice architecture:

| Component | Legacy Architecture (v1) | Redesigned Production Stack (v2) |
|:---|:---|:---|
| **Backend Engine** | Synchronous Python Flask runtime | High-performance **NestJS + Fastify** HTTP/2 REST & WebSocket API |
| **Frontend UI** | Static monolithic HTML/JS templates | **Next.js 16 App Router**, **React 19**, **Tailwind CSS v4** dark-theme studio (`#07090E`) |
| **Cryptography** | Static key storage & basic hashing | Hierarchical **AES-256-GCM Envelope Encryption** with Resource-Bound AAD (`@sem/crypto`) |
| **Authentication** | Basic bearer tokens | Asymmetric **ECDSA P-256 (ES256)** JWTs, single-use refresh token rotation & Argon2id |
| **Data Persistence** | Unindexed raw files & SQLite | **PostgreSQL 16** with **Drizzle ORM** schema migrations and strong multi-tenancy |
| **Background Tasks** | In-process blocking timers | Dedicated **BullMQ** worker (`@sem/worker`) backed by **Redis 7** for DEK rotation |
| **Developer Tools** | Ad-hoc shell scripts | Production-grade terminal CLI (`@sem-org/sem-cli`) and typed SDK (`@sem/sdk`) |
| **Testing & CI/CD** | Untested prototypes | **59 automated unit tests**, multi-stage Docker builds, CodeQL, and TruffleHog CI |

---

## 🚀 Key Features

### 🖥️ Next-Gen Frontend UI
- **Obsidian Dark Studio**: Custom-calibrated dark interface (`#07090E`) designed for developer ergonomics and clarity.
- **Interactive Secrets Studio**: Real-time reveal, copy, mask, and multi-format export (`.env`, `JSON`, `YAML`).
- **Bulk `.env` Diffing Engine**: Upload or paste full `.env` files with automated syntax highlighting, comment preservation, and visual change previews (additions, modifications, deletions).
- **Cross-Environment Comparison**: Inspect configuration differences across `development`, `staging`, and `production` side-by-side to eliminate environment drift.
- **Point-in-Time History & Rollback**: Instant snapshot creation and one-click rollback to prior environment states.
- **Real-Time Audit Explorer**: Searchable, filterable event logs with actor identity, action type, IP address, and timestamp.
- **Dynamic Variable Interpolation**: Cross-reference existing keys via `${VARIABLE_NAME}` syntax for modular environment configs.

### ⚙️ High-Performance Backend API
- **Fastify HTTP/2 Adapter**: Up to 4x throughput compared to traditional Express backends with minimal memory footprint.
- **Authenticated Envelope Encryption**: Secrets are encrypted using ephemeral 256-bit Data Encryption Keys (DEKs) wrapped by root Key Encryption Keys (KEKs).
- **Resource-Bound AAD**: Every ciphertext is cryptographically bound to its organizational context (`org:project:env:key`). Stolen ciphertexts cannot be decrypted in any other scope.
- **Single-Use Refresh Token Rotation**: Strict token-family tracking with automatic revocation of all issued tokens if token replay or tampering is detected.
- **Granular RBAC**: Scope-based permission checks (`@RequireScopes('secrets:read')`, `@RequireScopes('secrets:write')`) with verified tenant derivation (`@CurrentUser()`).
- **Resilient Rate Limiting**: Dual-tier rate limiting using Redis token bucket with automatic in-memory sliding window fallback.
- **Live WebSocket Streams**: Instant push notifications when configurations change across running CLI instances or dashboard sessions.

---

## 🎨 Visual Tour

<div align="center">

### Executive Workspace & Dashboard
*Real-time overview of organization projects, active secrets, environments, and activity metrics.*
![Dashboard](./screenshots/dashboard.png)

<br/>

### Encrypted Secrets Studio
*Live key-value management with variable masking, instant copying, search filtering, and bulk `.env` operations.*
![Secrets Management](./screenshots/secrets_page.png)

<br/>

### Multi-Tenant Project Directory
*Granular isolation across organizations, repositories, microservices, and custom environments.*
![Projects Directory](./screenshots/projects.png)

<br/>

### Cross-Environment Comparison Matrix
*Side-by-side diff engine across development, staging, and production to detect and eliminate configuration drift.*
![Cross-Environment Comparison](./screenshots/compare.png)

<br/>

### Point-in-Time History & One-Click Rollback
*Snapshot timeline tracking all cryptographic revisions with instant rollback capabilities.*
![Version History](./screenshots/version_history.png)

<br/>

### Authentication & Zero-Trust Session Gateway
*Argon2id credential verification, device tracking, and single-use refresh token exchange.*
![Login Screen](./screenshots/login_page.png)

</div>

---

## 🏗️ Architecture

SEM is structured as a modular monorepo managed with **pnpm workspaces** and **Turborepo**:

```text
Secure-Environment-Manager/
├── backend/            # NestJS + Fastify REST & WebSocket API (@sem/api, port 3001)
│   ├── src/domains/    # Auth, Secrets, Projects, Audit, API Keys domains
│   └── src/infra/      # Crypto, Drizzle ORM, Redis, WebSocket gateways
├── frontend/           # Next.js 16 App Router UI (port 3000)
│   ├── src/app/        # Dashboard, environment editor, audit logs, comparison
│   ├── src/components/ # Radix UI primitives, diff viewer, secret modals
│   └── src/lib/        # Bulk diff parser, error translation, API client
├── worker/             # BullMQ background worker for key rotation (@sem/worker)
├── cli/                # Interactive terminal CLI (@sem-org/sem-cli)
├── packages/
│   ├── crypto/         # AES-256-GCM envelope encryption engine (@sem/crypto)
│   ├── sdk/            # Type-safe TypeScript client SDK (@sem/sdk)
│   └── types/          # Shared DTOs, interfaces, and API contracts (@sem/types)
├── docker-compose.yml  # Production multi-service Docker composition
└── .github/workflows/  # CI build, lint, typecheck, unit test, and security pipelines
```

### Component Interaction Diagram

```mermaid
flowchart TD
    subgraph Clients["Clients & Interfaces"]
        FE["Frontend (Next.js 16)"]
        CLI["CLI (@sem-org/sem-cli)"]
        SDK["TypeScript SDK (@sem/sdk)"]
    end

    subgraph Gateway["API Gateway (@sem/api)"]
        Nest["NestJS + Fastify Engine"]
        Guards["Auth, RBAC & Tenant Guards"]
        Crypto["Crypto Engine (@sem/crypto)"]
    end

    subgraph Storage["State & Queue Layer"]
        PG[("PostgreSQL 16 (Drizzle ORM)")]
        Redis[("Redis 7 (Cache & BullMQ)")]
    end

    subgraph Workers["Background Services"]
        Worker["BullMQ Worker (@sem/worker)"]
    end

    FE -->|HTTPS / WSS| Nest
    CLI -->|HTTPS REST| Nest
    SDK -->|HTTPS REST| Nest

    Nest --> Guards
    Guards --> Crypto
    Crypto --> PG
    Nest --> PG
    Nest --> Redis
    Redis --> Worker
    Worker --> PG
```

---

## 🔐 Security Model & Cryptographic Pipeline

SEM enforces a strict zero-trust boundary around all secret values:

```
┌────────────────────────────────────────────────────────┐
│               MASTER ROOT KEY (KEK)                    │
│             32-byte Cryptographic Seed                 │
└──────────────────────────┬─────────────────────────────┘
                           │ Wraps
                           ▼
┌────────────────────────────────────────────────────────┐
│             PROJECT KEY ENCRYPTION KEY                 │
│               Unique per Organization                  │
└──────────────────────────┬─────────────────────────────┘
                           │ Wraps
                           ▼
┌────────────────────────────────────────────────────────┐
│             ENVIRONMENT DATA KEY (DEK)                 │
│               Unique per Environment                   │
└──────────────────────────┬─────────────────────────────┘
                           │ Encrypts (AES-256-GCM + AAD)
                           ▼
┌────────────────────────────────────────────────────────┐
│                    SECRET VALUE                        │
│          Authenticated Ciphertext + Nonce + Tag        │
└────────────────────────────────────────────────────────┘
```

1. **Envelope Key Hierarchy**: Plaintext secrets are encrypted with a random 256-bit DEK. The DEK is encrypted with the project KEK, which is wrapped by the Master Key.
2. **Authenticated Encryption with AAD**: Encryption uses AES-256-GCM with a fresh 12-byte random IV. The ciphertext is bound to `org:project:env:key` as Additional Authenticated Data.
3. **Argon2id Passwords**: Resistant against GPU and ASIC brute-force attacks (OWASP parameters: 64MB memory, 3 iterations, 4 parallelism).
4. **Asymmetric ECDSA Signatures**: JWT access tokens are signed with ES256 (NIST P-256 curve), allowing stateless verification across microservices without distributing signing keys.
5. **Single-Use Refresh Tokens**: Refresh tokens are family-indexed in Redis. Any replay attempt invalidates all active sessions for the user.

---

## ⚡ Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 22.0.0`
- [pnpm](https://pnpm.io/) `>= 9.0.0` (`corepack enable pnpm`)
- [Docker & Docker Compose](https://www.docker.com/) (recommended)

### Option 1: Docker Compose (Recommended)

The fastest way to run the complete redesigned stack locally:

```bash
# 1. Clone repository
git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
cd Secure-Environment-Manager

# 2. Copy environment configuration
cp .env.example .env

# 3. Generate cryptographic master keys into .env
pnpm keys:generate

# 4. Start all services in the background
docker compose up --build -d
```

Once running:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **REST API**: [http://localhost:3001](http://localhost:3001)
- **API Healthcheck**: `curl http://localhost:3001/healthz`

### Option 2: Bare-Metal Development Setup

```bash
# 1. Install all dependencies across monorepo packages
pnpm install

# 2. Configure environment
cp .env.example .env
pnpm keys:generate

# 3. Run database migrations & bootstrap administrator account
pnpm db:migrate
pnpm db:bootstrap

# 4. Build all TypeScript packages
pnpm build

# 5. Start dev servers (API + Frontend + Worker)
pnpm dev
```

---

## 💻 CLI Usage

The redesigned CLI (`@sem-org/sem-cli`) provides a secure developer experience directly in the terminal:

```bash
# Build & globally link CLI
pnpm --filter @sem-org/sem-cli build
npm install -g ./cli

# 1. Configure target server
sem config set url http://localhost:3001

# 2. Authenticate
sem auth login

# 3. Pull environment variables into local .env
sem secrets pull --namespace default --environment production > .env

# 4. Set a single secret securely
sem secrets set API_KEY sk_live_abc123 --comment "Stripe API Key"

# 5. Inject secrets directly into child processes (no plaintext files on disk!)
sem run --namespace default --environment production -- npm start
```

---

## 📦 SDK Integration

Integrate SEM directly into your Node.js or TypeScript application using `@sem/sdk`:

```bash
pnpm add @sem/sdk
```

```typescript
import { SemClient } from '@sem/sdk';

// Initialize with an API key or credentials
const client = new SemClient({
  baseUrl: 'http://localhost:3001',
  apiKey: process.env.SEM_API_KEY, // format: sem_<id>_<secret>
});

// Fetch a decrypted secret value
const dbUrl = await client.getSecret('my-project', 'production', 'DATABASE_URL');
console.log('Connected to:', dbUrl.value);

// Upsert a secret with metadata
await client.upsertSecret('my-project', 'production', 'REDIS_PORT', {
  value: '6379',
  comment: 'Primary cache cluster port',
});

// Export all environment secrets directly into process.env format
const envMap = await client.exportSecrets('my-project', 'production', 'env');
```

---

## 🧪 Testing & Verification

SEM maintains strict automated testing standards with **100% test pass rates**:

```bash
# Run unit test suites across all packages
pnpm test:unit

# Type check all packages
pnpm typecheck

# Lint API, CLI, and Frontend
pnpm lint
```

### Verified Test Matrix (59/59 Passing)

| Package | Test Suite | Tests | Status | Coverage |
|:---|:---|:---:|:---:|:---|
| `@sem/crypto` | `envelope.spec.ts`, `tokens.spec.ts` | 18 | `PASS` | Envelope encryption, KEK/DEK wrapping, AAD binding, HMAC indexing |
| `@sem/api` | `jwt-security.spec.ts`, `guards-and-rbac.spec.ts`, `token-service.spec.ts`, `users-service.spec.ts` | 23 | `PASS` | ES256 validation, RBAC scopes, admin bypasses, rate limiting fallbacks |
| `@sem/sdk` | `client.spec.ts` | 7 | `PASS` | API key auth, credential refresh, CRUD operations, error mapping |
| `@sem-org/sem-cli` | `config.spec.ts` | 4 | `PASS` | Cross-platform configuration storage, command registration |
| `frontend` | `bulk-diff.spec.ts`, `error-translation.spec.ts` | 7 | `PASS` | `.env` parsing, diff engine, API error code translation |

---

## ⚙️ Configuration Reference

| Environment Variable | Required | Default | Description |
|:---|:---:|:---:|:---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (`postgresql://sem:pass@localhost:5432/sem`) |
| `REDIS_URL` | Yes | — | Redis connection string (`redis://:pass@localhost:6379`) |
| `SEM_MASTER_KEY` | Yes | — | 32-byte base64-encoded AES master encryption key (KEK) |
| `JWT_PRIVATE_KEY` | Yes | — | ECDSA P-256 (ES256) private key in PEM format |
| `JWT_PUBLIC_KEY` | Yes | — | ECDSA P-256 (ES256) public key in PEM format |
| `SEM_TOKEN_HMAC_KEY` | Yes | — | 32-byte base64-encoded HMAC key for refresh token indexing |
| `SEM_MASTER_TOKEN` | Yes | — | Emergency bootstrap token for initial administrative setup |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated list of allowed origins |
| `API_PORT` | No | `3001` | API listening port |
| `NEXT_PUBLIC_API_URL`| No | `http://localhost:3001` | API base URL for frontend browser requests |

---

## 🗺️ Project Roadmap

- [x] Complete backend rewrite in NestJS + Fastify
- [x] Complete frontend redesign in Next.js 16 + React 19 + Tailwind CSS v4
- [x] Hierarchical AES-256-GCM envelope encryption engine (`@sem/crypto`)
- [x] Asymmetric ES256 authentication and single-use refresh token rotation
- [x] Point-in-time snapshots, diffing viewer, and one-click rollbacks
- [x] Cross-platform CLI with runtime environment injection
- [x] Type-safe TypeScript client SDK (`@sem/sdk`)
- [x] Automated DEK rotation background worker (`@sem/worker`)
- [ ] OIDC / SAML Single Sign-On (Okta, Google Workspace, GitHub)
- [ ] Kubernetes Operator for native Kubernetes Secret synchronization
- [ ] HashiCorp Vault & AWS KMS external key provider backend

---

## 🤝 Contributing

We welcome contributions from the open-source community!

- Please review our **[CONTRIBUTING.md](./CONTRIBUTING.md)** for development guidelines and coding standards.
- All participants are expected to adhere to our **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**.
- For architectural deep dives, consult **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
- For AI agent pair programming standards, see **[AGENTS.md](./AGENTS.md)**.

---

## 🛡️ Security Vulnerability Reporting

If you discover a security vulnerability within Secure Environment Manager, please **do not open a public GitHub issue**. Instead, follow our responsible disclosure process outlined in **[SECURITY.md](./SECURITY.md)** or email **niranjansah250@gmail.com**.

---

## 📄 License

Secure Environment Manager is open-source software licensed under the **[MIT License](./LICENSE)**.

---

<div align="center">
  <sub>Maintained with ❤️ by <a href="https://github.com/niranjansah87">Niranjan Sah</a> and the open-source community.</sub>
</div>
