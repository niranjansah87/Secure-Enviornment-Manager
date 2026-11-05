<div align="center">

# Secure Environment Manager (SEM)

### Self-Hosted, Multi-Tenant Developer Secrets Infrastructure with Envelope Encryption

[![CI](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/ci.yml)
[![Security Scan](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/security.yml/badge.svg)](https://github.com/niranjansah87/Secure-Enviornment-Manager/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange.svg)](https://pnpm.io/)

</div>

---

## 1. Project Introduction

**Secure Environment Manager (SEM)** is an open-source, developer-controlled secrets management and configuration distribution platform. Designed as a self-hosted alternative to proprietary SaaS secret managers, SEM provides end-to-end envelope encryption, cryptographic isolation across environments, granular role-based access control, point-in-time snapshots, and automated key rotation without vendor lock-in.

---

## 2. Problem Statement

Modern software engineering teams frequently struggle with:
- **Secret Sprawl**: Sensitive API keys, database credentials, and tokens committed into git repositories or scattered across unencrypted `.env` files.
- **Environment Drift**: Inconsistencies between development, staging, and production configurations causing silent failures and deployment delays.
- **Third-Party Risk**: SaaS secrets managers that store master keys in proprietary clouds, exposing mission-critical infrastructure to third-party vendor compromise.
- **Lack of Auditing**: Inability to identify who viewed, updated, or rotated an environment variable when an incident occurs.

SEM solves these problems by providing self-hosted developer infrastructure where your team retains complete ownership of keys, storage, and access policies.

---

## 3. Main Features

- 🔐 **Authenticated Envelope Encryption**: Hierarchical key architecture using AES-256-GCM. Plaintext is never encrypted with root keys, and ciphertext is location-bound via Additional Authenticated Data (AAD).
- 🏢 **Multi-Tenant & Environment Scoping**: Logical isolation across organizations, projects, and environments (`development`, `staging`, `production`, or custom branches).
- 🔑 **ECDSA P-256 (ES256) Authentication**: Asymmetric JWT authentication, single-use refresh token rotation with automated reuse detection, and Argon2id password hashing.
- 📦 **Automated Snapshots & Point-in-Time Rollback**: Capture full environment states, compare diffs across stages, and revert accidental secret regressions with one click.
- 📜 **Immutable Audit Logging**: Every secret creation, mutation, read, or export produces a cryptographically sealed audit trail recording actor, action, timestamp, and client IP.
- 💻 **Cross-Platform CLI & TypeScript SDK**: Inject runtime configurations with the `sem` terminal CLI or consume secrets natively in Node.js/TypeScript applications using `@sem/sdk`.
- ⚡ **Real-Time Synchronization**: WebSocket-powered live updates reflect configuration changes across connected instances instantly.

---

## 4. Screenshots

<div align="center">

### Modern Management Dashboard
![Dashboard](./screenshots/dashboard.png)

### Encrypted Secrets Editor & Diff Viewer
![Secrets Management](./screenshots/secrets_page.png)

### Immutable Cryptographic Audit Log
![Audit Logs](./screenshots/audit_logs.png)

### Developer Workflow & Login
![Login Screen](./screenshots/login_page.png)

</div>

---

## 5. Architecture Overview

SEM is built as a high-performance monorepo using pnpm workspaces and Turborepo:

```text
Secure-Environment-Manager/
├── backend/            # NestJS + Fastify REST & WebSocket API (@sem/api, port 3001)
├── frontend/           # Next.js 16 App Router UI (port 3000)
├── worker/             # BullMQ background worker for key rotation (@sem/worker)
├── cli/                # Interactive terminal CLI (@sem-org/sem-cli)
├── packages/
│   ├── crypto/         # AES-256-GCM envelope encryption engine (@sem/crypto)
│   ├── sdk/            # Official TypeScript client SDK (@sem/sdk)
│   └── types/          # Shared DTOs, schemas, and API contracts (@sem/types)
└── docker-compose.yml  # Production compose stack (Postgres, Redis, API, Frontend, Worker)
```

For complete technical specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 6. Technology Stack

- **Backend API**: [NestJS](https://nestjs.com/) with [Fastify](https://www.fastify.io/) adapter (TypeScript)
- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
- **Database & ORM**: [PostgreSQL 16](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Caching & Queues**: [Redis 7](https://redis.io/) with [BullMQ](https://bullmq.io/)
- **Cryptography**: AES-256-GCM, ECDSA P-256 (ES256), Argon2id (`@sem/crypto`)
- **CLI & SDK**: [Commander.js](https://github.com/tj/commander.js), [Vitest](https://vitest.dev/)

---

## 7. Security Model

SEM operates on a zero-implicit-trust security model:

1. **Envelope Key Hierarchy**:
   $$\text{Master Key} \xrightarrow{\text{wraps}} \text{Project KEK} \xrightarrow{\text{wraps}} \text{Environment DEK} \xrightarrow{\text{encrypts}} \text{Secret}$$
2. **Additional Authenticated Data (AAD)**: Ciphertext is cryptographically bound to its resource path (`org:project:env:key`). Ciphertext copied to another environment cannot be decrypted.
3. **Short-Lived Access Tokens**: JWTs expire after 15 minutes. Refresh tokens are single-use; any detected replay revokes the entire token family immediately.
4. **Tenant Isolation**: All database operations scope records by `orgId` extracted from verified JWT claims. Insecure Direct Object References (IDOR) are structurally prevented.

---

## 8. Installation & Prerequisites

- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 9.0.0` (`corepack enable pnpm`)
- **PostgreSQL**: `>= 16.0`
- **Redis**: `>= 7.0`
- **Docker & Docker Compose**: Recommended for containerized deployment

---

## 9. Docker Deployment (Recommended)

The simplest way to deploy a self-hosted SEM stack:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
   cd Secure-Environment-Manager
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Generate cryptographic keys into `.env`:**
   ```bash
   pnpm keys:generate
   ```

4. **Launch the stack:**
   ```bash
   docker compose up --build -d
   ```

5. **Verify deployment:**
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **API Health**: `curl http://localhost:3001/healthz`

---

## 10. Manual / Bare-Metal Installation

1. **Install workspace dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   pnpm keys:generate
   ```

3. **Run database migrations and bootstrap default administrator:**
   ```bash
   pnpm db:migrate
   pnpm db:bootstrap
   ```

4. **Build and start services:**
   ```bash
   pnpm build
   pnpm dev
   ```

---

## 11. Configuration Reference

Key variables in `.env`:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://sem:pass@localhost:5432/sem`) |
| `REDIS_URL` | Yes | Redis connection string (`redis://:pass@localhost:6379`) |
| `SEM_MASTER_KEY` | Yes | 32-byte base64-encoded AES master encryption key |
| `JWT_PRIVATE_KEY` | Yes | ECDSA P-256 (ES256) private key PEM |
| `JWT_PUBLIC_KEY` | Yes | ECDSA P-256 (ES256) public key PEM |
| `SEM_TOKEN_HMAC_KEY` | Yes | 32-byte base64-encoded HMAC key for refresh token indexing |
| `SEM_MASTER_TOKEN` | Yes | Bootstrap token for emergency administrative recovery |
| `CORS_ORIGINS` | No | Comma-separated list of allowed origins (e.g., `http://localhost:3000`) |
| `API_PORT` | No | API listening port (default: `3001`) |

---

## 12. Authentication & Credential Management

SEM supports three authentication mechanisms:

1. **User Credentials (Argon2id)**: Standard username/password login generating short-lived ES256 JWT access tokens and single-use refresh tokens.
2. **API Keys**: Scoped tokens in `sem_<identifier>_<secret>` format designed for CI/CD pipelines and microservices.
3. **Master Token**: Dedicated emergency token (`SEM_MASTER_TOKEN`) used to provision initial administrative access.

---

## 13. TypeScript SDK Usage

Install `@sem/sdk` in your Node.js/TypeScript application:

```typescript
import { SemClient } from '@sem/sdk';

const client = new SemClient({
  baseUrl: 'https://sem.example.com',
  apiKey: process.env.SEM_API_KEY,
});

// Fetch a single secret
const dbPassword = await client.getSecret('my-project', 'production', 'DATABASE_PASSWORD');
console.log('Secret value:', dbPassword.value);

// Upsert a secret value
await client.upsertSecret('my-project', 'production', 'API_TOKEN', {
  value: 'new-secret-token',
  comment: 'Automated CI rotation',
});

// Export all environment variables in .env format
const dotEnv = await client.exportSecrets('my-project', 'production', 'env');
```

---

## 14. Command-Line Interface (CLI)

Install or run the CLI:

```bash
# Link CLI globally for development
pnpm --filter @sem-org/sem-cli build
npm install -g ./cli

# Initialize configuration
sem config init

# Log in
sem auth login

# List secrets
sem secrets list --namespace default --environment production

# Get secret value
sem secrets get DATABASE_URL

# Set secret value
sem secrets set API_KEY sk_live_abc123

# Inject environment into a process
sem run -- npm start
```

---

## 15. API Documentation

When `SWAGGER_ENABLED=true` is set, interactive OpenAPI/Swagger documentation is available at:
```text
http://localhost:3001/api/docs
```

### Core API Endpoints

- `POST /api/v1/auth/login` — Authenticate and receive token pair
- `POST /api/v1/auth/refresh` — Rotate refresh token and receive new access token
- `GET /api/v1/projects/:projectId/environments/:envId/secrets` — List secrets
- `GET /api/v1/projects/:projectId/environments/:envId/secrets/:key/value` — Retrieve decrypted secret
- `PUT /api/v1/projects/:projectId/environments/:envId/secrets/:key` — Upsert secret
- `DELETE /api/v1/projects/:projectId/environments/:envId/secrets/:key` — Delete secret
- `POST /api/v1/projects/:projectId/environments/:envId/snapshots` — Create point-in-time snapshot
- `GET /api/v1/audit` — Query audit event trail

---

## 16. Backup and Recovery

1. **Database Backup**:
   ```bash
   pg_dump -U sem -d sem -F c -b -v -f sem_backup.dump
   ```
2. **Key Material Preservation**:
   Always back up `SEM_MASTER_KEY`, `JWT_PRIVATE_KEY`, and `SEM_TOKEN_HMAC_KEY` in an offline vault. Without `SEM_MASTER_KEY`, database ciphertexts cannot be decrypted.
3. **Database Restore**:
   ```bash
   pg_restore -U sem -d sem -v sem_backup.dump
   ```

---

## 17. Development Guide

```bash
# Compile packages
pnpm build

# Type check across all packages
pnpm typecheck

# Run linter
pnpm lint

# Run unit test suites
pnpm test:unit
```

---

## 18. Testing Strategy

SEM enforces comprehensive automated testing across all layers:

- **Cryptographic tests**: Nonce generation, AAD validation, key wrapping/unwrapping, and ciphertext corruption detection (`packages/crypto/`).
- **Security & RBAC unit tests**: JWT signature verification, algorithm confusion rejection, scope checking, and rate limiter fallbacks (`backend/test/unit/`).
- **SDK & CLI unit tests**: Authentication caching, refresh rotation, command dispatching, and cross-platform config (`packages/sdk/`, `cli/`).
- **Integration tests**: Database queries, soft-deletion, and tenant isolation against real PostgreSQL and Redis containers (`backend/test/integration/`).

---

## 19. Contributing

We welcome contributions from the community! Please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** and **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** before submitting pull requests.

---

## 20. Project Roadmap

- [x] Multi-tenant envelope encryption (AES-256-GCM)
- [x] ECDSA P-256 asymmetric authentication with single-use refresh rotation
- [x] Environment snapshotting, rollback, and cross-stage diff viewer
- [x] Interactive Terminal CLI and TypeScript SDK
- [x] Automated DEK rotation background worker
- [ ] OIDC / SAML SSO integration (Okta, Google Workspace, GitHub)
- [ ] Kubernetes Operator for native Secret syncing
- [ ] HashiCorp Vault external KMS key provider backend

---

## 21. License

Secure Environment Manager is licensed under the **[MIT License](./LICENSE)**.

---

## 22. Support & Community

- **Discussions & Questions**: [GitHub Discussions](https://github.com/niranjansah87/Secure-Enviornment-Manager/discussions)
- **Issue Tracker**: [GitHub Issues](https://github.com/niranjansah87/Secure-Enviornment-Manager/issues)
- **Security Disclosures**: Please refer to [SECURITY.md](./SECURITY.md)
