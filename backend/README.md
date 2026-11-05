# Secure Environment Manager — Backend (`@sem/api`)

The primary backend service for SEM V2, built with **NestJS**, **Fastify**, **Drizzle ORM**, **PostgreSQL**, **Redis**, and **BullMQ**.

## Architecture & Features

- **Port**: `3001` (all API routes under `/api/v1`)
- **Web Framework**: NestJS with Fastify HTTP adapter
- **Security & Cryptography**:
  - ES256 asymmetric JWT authentication with refresh token rotation
  - Envelope encryption via `@sem/crypto` (Master Key → Project KEK → Environment DEK)
  - Cryptographically secure API keys (`sem_<id>_<secret>`) with Argon2id hashing
  - Append-only audit logging scoped per organization
  - Comprehensive tenant isolation on all queries
- **Domains (`src/domains/`)**:
  - `analytics`: Usage and secret metric statistics
  - `api-keys`: API key creation, revocation, and scope validation
  - `audit`: Append-only security audit log queries
  - `auth`: Login, JWT issuance, refresh, password reset, and session verification
  - `environments`: Environment CRUD (dev, staging, prod, etc.)
  - `health`: Liveness and readiness probes (`/healthz`, `/livez`)
  - `history`: Version history, rollback, and change tracking
  - `organizations`: Multi-tenant organization boundaries
  - `projects`: Project management and KEK derivation
  - `remote-config`: Client SDK secure runtime fetching
  - `secrets`: Envelope-encrypted secret management (CRUD, reveal, versions, export, bulk import, diff)
  - `snapshots`: Environment-wide point-in-time state capture and restore
  - `templates`: Project template configuration
  - `users`: User management, roles, and password policies

## Common Commands

```bash
# Start development server with hot-reload
pnpm dev

# Build for production
pnpm build

# Run unit tests
pnpm test:unit

# Run integration tests (requires running Postgres + Redis)
pnpm test:integration

# Run database migrations
pnpm db:migrate

# Seed default organization and master identity
pnpm db:bootstrap

# Generate cryptographic keys into .env
pnpm keys:generate
```

