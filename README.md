# Secure Environment Manager V2

Secrets management API — envelope-encrypted at rest, multi-tenant, audit-logged.

## Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS + Fastify (TypeScript) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Queue | BullMQ + Redis 7 |
| Encryption | AES-256-GCM (envelope: master key → KEK → DEK) |
| Auth | ES256 JWT + Argon2id + refresh-token rotation |
| Frontend | Next.js 14 |

## Repository layout

```
backend/        NestJS API (port 3001) (@sem/api)
worker/         BullMQ maintenance worker (@sem/worker)
frontend/       Next.js frontend (port 3000)
backend_v1/     Legacy Flask backend (archived reference)
packages/
  crypto/       AES-256-GCM envelope encryption (@sem/crypto)
  types/        Shared TypeScript types (@sem/types)
  sdk/          TypeScript client SDK (@sem/sdk)
tools/
  migrate/      V1 → V2 data migration (TypeScript/tsx)
infra/
  nginx/        sem-v2.conf — production reverse proxy
```

## Quick start (local dev)

**Prerequisites:** Node 22, pnpm 9, Docker

```bash
# 1. Start dependencies (Postgres + Redis)
docker compose -f docker-compose.v2.yml up -d postgres redis

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Generate cryptographic key material automatically:
pnpm keys:generate

# 4. Run database migrations & seed default organization/master user
pnpm db:migrate
pnpm db:bootstrap

# 5. Run both Backend & Frontend simultaneously with Turborepo:
pnpm dev

# Or run specific workspaces independently:
pnpm dev:backend   # NestJS API on http://localhost:3001
pnpm dev:frontend  # Next.js Frontend on http://localhost:3000
pnpm dev:worker    # BullMQ worker process
```

## Docker (full stack)

```bash
cp .env.example .env   # fill in real secrets
docker compose -f docker-compose.v2.yml up --build
```

Services: `postgres` (5432), `redis` (6379), `api` (3001), `worker`.

Health check: `curl http://localhost:3001/api/v1/health`

## Environment variables

See `.env.example` for the full list. Required at minimum:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SEM_MASTER_KEY` | 32-byte base64 master encryption key |
| `SEM_JWT_PRIVATE_KEY` | ES256 (ECDSA P-256) private key PEM |
| `SEM_JWT_PUBLIC_KEY` | ES256 public key PEM |
| `SEM_TOKEN_HMAC_KEY` | 32-byte base64 HMAC key for refresh token lookup |

## Tests

```bash
# Unit + crypto tests
pnpm --filter @sem/crypto test

# Integration tests (requires running postgres + redis)
docker compose -f docker-compose.v2.yml up -d postgres redis
pnpm --filter @sem/api test:integration
```

## Migrating from V1

See `tools/migrate/` for the V1 → V2 migration tool.

```bash
# Dry run (no DB writes)
SEM_V1_ENCRYPTION_KEY=<fernet-key> DATABASE_URL=<v2-url> SEM_MASTER_KEY=<key> \
  pnpm --filter @sem/migrate migrate:dry --data-dir /path/to/v1/data

# Execute
SEM_V1_ENCRYPTION_KEY=<fernet-key> DATABASE_URL=<v2-url> SEM_MASTER_KEY=<key> \
  pnpm --filter @sem/migrate migrate --execute --data-dir /path/to/v1/data
```

**Important:** All V1 API keys are invalidated during migration (V1 used a fixed PBKDF2 salt). Users must create new API keys after logging in.

## Security model

- Secrets encrypted with AES-256-GCM; plaintext never written to disk, logs, or queues
- Each environment has its own DEK, wrapped by a project KEK, wrapped by the master key
- Refresh tokens: Argon2id-hashed + HMAC lookup; reuse of a revoked token revokes all sessions for that user
- API keys: `sem_<id>_<secret>` format; only the secret portion is Argon2id-hashed
- Audit log is append-only (INSERT+SELECT only DB role); written in the same transaction as secret mutations
- Tenant isolation enforced at query level: every data-access query is scoped by `org_id` from the verified JWT

See `SECURITY.md` and `ARCHITECTURE.md` for full detail.

## License

See `LICENSE`.
