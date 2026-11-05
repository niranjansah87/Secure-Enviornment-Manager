<div align="center">

# ⚙️ Secure Environment Manager — Backend API (`@sem/api`)

### Enterprise-Grade REST & WebSocket API Engine with Envelope Encryption

[![NestJS](https://img.shields.io/badge/NestJS-12.x-E0234E.svg?logo=nestjs)](https://nestjs.com/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000.svg?logo=fastify)](https://fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F.svg)](https://orm.drizzle.team/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D.svg?logo=redis)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-6.x-7A52B3.svg)](https://bullmq.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 1. Overview

`@sem/api` is the core backend service powering **Secure Environment Manager (SEM)**. Engineered as a high-throughput, low-latency microservice using **NestJS** and the **Fastify HTTP adapter**, it handles authentication, multi-tenant organization boundaries, role-based access control (RBAC), real-time WebSocket events, and cryptographic envelope encryption for developer secrets.

All database mutations and queries are strongly isolated by organization tenants (`orgId`) derived directly from verified cryptographic credentials, ensuring absolute tenant privacy with zero risk of Insecure Direct Object References (IDOR).

---

## 2. Core Architecture & Security Principles

### A. Envelope Encryption Engine (`@sem/crypto`)
Plaintext secret values never touch persistent storage or root encryption keys. The backend coordinates with `@sem/crypto` using a strict three-tier envelope hierarchy:
1. **Master Key (KEK)**: 256-bit root key stored securely in environment configuration (`SEM_MASTER_KEY`).
2. **Project Key Encryption Key (Project KEK)**: Unique 256-bit AES key per project, encrypted at rest by the Master KEK.
3. **Environment Data Encryption Key (Environment DEK)**: Unique 256-bit AES key generated per environment, encrypted at rest by the Project KEK.
4. **Secret Ciphertext**: Encrypted with the Environment DEK using **AES-256-GCM** with a fresh 12-byte random IV and 16-byte authentication tag per secret.
5. **Resource-Bound AAD**: Additional Authenticated Data (`org:project:env:key`) is cryptographically bound into the AES-256-GCM auth tag. Ciphertext cannot be transplanted to another environment or key path.

### B. Asymmetric ECDSA (ES256) Authentication
- **Access Tokens**: Short-lived (15 minutes) JWTs signed using ECDSA P-256 (`JWT_PRIVATE_KEY`), verified statelessly across services with the public key (`JWT_PUBLIC_KEY`).
- **Refresh Token Rotation**: Single-use refresh tokens indexed via HMAC-SHA256 in Redis. Any reuse or duplicate presentation immediately revokes the entire token family.
- **Passwords**: Hashed with Argon2id using OWASP-recommended parameters (64MB memory, 3 iterations, 4 parallelism).

### C. Granular RBAC & Tenant Scoping
- **Scoped Guards**: Endpoints enforce granular permission scopes (e.g. `@RequireScopes('secrets:read')`, `@RequireScopes('secrets:write')`, `@RequireScopes('admin')`).
- **Tenant Derivation**: Queries automatically extract `orgId` from verified `@CurrentUser()` claims, preventing multi-tenant data leakage.

### D. Dual-Tier Rate Limiting
- Primary token bucket algorithm powered by Redis.
- Automatic in-memory sliding window fallback if Redis connectivity is temporarily interrupted.

---

## 3. Domain Modules (`src/domains/`)

The backend is structured into modular domain boundaries:

| Domain | Path | Responsibilities |
|:---|:---|:---|
| **`auth`** | `src/domains/auth/` | User authentication, ES256 token issuance, single-use refresh token rotation, Argon2id passwords, and session invalidation. |
| **`secrets`** | `src/domains/secrets/` | Envelope-encrypted CRUD, value reveal, bulk `.env` import, side-by-side diffing, and export. |
| **`projects`** | `src/domains/projects/` | Project creation, KEK derivation, membership assignment, and repository linking. |
| **`environments`** | `src/domains/environments/` | Environment lifecycle management (`development`, `staging`, `production`, and custom branches). |
| **`snapshots`** | `src/domains/snapshots/` | Point-in-time full environment captures, diff inspections, and atomic one-click rollbacks. |
| **`history`** | `src/domains/history/` | Immutable revision tracking, diff calculation between revisions, and audit attribution. |
| **`api-keys`** | `src/domains/api-keys/` | High-entropy machine credentials (`sem_<id>_<secret>`), HMAC hashing, and scope validation. |
| **`audit`** | `src/domains/audit/` | Append-only security audit log queries filtered by organization, actor, action, and date. |
| **`templates`** | `src/domains/templates/` | Dynamic variable templates and cross-secret references (`${DATABASE_HOST}`). |
| **`users`** | `src/domains/users/` | User lifecycle, organization invitations, role assignment, and password policies. |
| **`organizations`**| `src/domains/organizations/` | Multi-tenant organization accounts and workspace boundaries. |
| **`remote-config`**| `src/domains/remote-config/` | Secure runtime secret delivery for CLI (`sem run`) and SDK integrations. |
| **`health`** | `src/domains/health/` | Liveness (`/livez`) and readiness (`/healthz`) probes for container orchestrators. |

---

## 4. API Reference

When `SWAGGER_ENABLED=true`, interactive OpenAPI documentation is generated at:
```text
http://localhost:3001/api/docs
```

### Core REST Endpoints

#### Authentication & Sessions
- `POST /api/v1/auth/login` — Authenticate with email/password and receive ES256 token pair.
- `POST /api/v1/auth/refresh` — Rotate single-use refresh token and receive fresh access token.
- `POST /api/v1/auth/logout` — Revoke active session and refresh token family.
- `GET  /api/v1/auth/me` — Retrieve current authenticated user profile and scopes.

#### Secrets Management
- `GET    /api/v1/projects/:projectId/environments/:env/secrets` — List secret metadata (names, tags, comments).
- `GET    /api/v1/projects/:projectId/environments/:env/secrets/:key/value` — Retrieve decrypted secret plaintext.
- `PUT    /api/v1/projects/:projectId/environments/:env/secrets/:key` — Upsert secret (generates fresh DEK + AAD).
- `DELETE /api/v1/projects/:projectId/environments/:env/secrets/:key` — Soft-delete secret.
- `POST   /api/v1/projects/:projectId/environments/:env/secrets/bulk` — Import bulk `.env` payload with validation.
- `GET    /api/v1/projects/:projectId/environments/:env/secrets/export` — Export formatted secrets (`.env`, `json`, `yaml`).

#### Snapshots & History
- `POST /api/v1/projects/:projectId/environments/:env/snapshots` — Capture atomic point-in-time snapshot.
- `GET  /api/v1/projects/:projectId/environments/:env/snapshots` — List historical snapshots.
- `POST /api/v1/projects/:projectId/environments/:env/snapshots/:id/rollback` — Atomic rollback to snapshot state.
- `GET  /api/v1/projects/:projectId/environments/:env/history` — Query key change audit history.

#### Machine API Keys
- `GET    /api/v1/api-keys` — List API keys for current organization.
- `POST   /api/v1/api-keys` — Provision new scoped API key (`sem_<id>_<secret>`).
- `DELETE /api/v1/api-keys/:id` — Immediately revoke an API key.

#### Audit Trail
- `GET /api/v1/audit` — Query immutable organization audit trail with pagination and filters.

---

## 5. Real-Time WebSocket Gateway

The API provides a Socket.IO WebSocket gateway listening under the `/events` namespace:
- **Authentication**: Clients pass their ES256 Bearer token during the initial connection handshake.
- **Rooms**: Clients join organization and environment rooms (`org:<orgId>:env:<envId>`).
- **Events Emitted**:
  - `secret.created` / `secret.updated` / `secret.deleted`
  - `snapshot.created` / `snapshot.restored`
  - `key.rotated`
- **Adapter**: Distributed across multiple API instances via `@socket.io/redis-adapter`.

---

## 6. Environment Configuration

Create a `.env` file in the project root or `backend/` directory:

```ini
# Application
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000
SWAGGER_ENABLED=true

# Database & Cache
DATABASE_URL=postgresql://sem_app:sem_pass@localhost:5432/sem
REDIS_URL=redis://localhost:6379

# Cryptography & Key Management (Generate via: pnpm keys:generate)
SEM_MASTER_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
JWT_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
SEM_TOKEN_HMAC_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
SEM_MASTER_TOKEN=sem_master_emergency_bootstrap_token_secret

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 7. Development & Testing Commands

```bash
# 1. Generate cryptographic keys into .env
pnpm keys:generate

# 2. Run database migrations (Drizzle ORM)
pnpm db:migrate

# 3. Seed default organization and master administrative account
pnpm db:bootstrap

# 4. Start local development server with hot-reload
pnpm dev

# 5. Typecheck with TypeScript
pnpm typecheck

# 6. Run linter
pnpm lint

# 7. Execute Vitest unit test suite (23 tests)
pnpm test:unit

# 8. Execute integration tests against PostgreSQL & Redis
pnpm test:integration
```
