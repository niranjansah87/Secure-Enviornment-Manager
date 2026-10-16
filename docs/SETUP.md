# Setup Instructions (SEM V2)

Secure Environment Manager V2 is a high-performance, multi-tenant secrets management platform built on NestJS Fastify, PostgreSQL with Drizzle ORM, AES-256-GCM envelope encryption, and Next.js 15.

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: >= 22.0.0
- **pnpm**: >= 9.0.0
- **PostgreSQL**: 16 (Local or via Docker)
- **Redis**: 7 (Optional for standalone dev; required for BullMQ queues)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Generate cryptographic keys and secrets automatically:
```bash
pnpm keys:generate
```
This populates:
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (ES256 ECDSA P-256 key pair)
- `SEM_MASTER_KEY` (32-byte AES-256 base64 key)
- `SEM_TOKEN_HMAC_KEY` (32-byte HMAC key)
- `SEM_MASTER_TOKEN` (high-entropy master administrative token)

### 4. Database Setup & Seeding
Ensure PostgreSQL is running and matches your `DATABASE_URL` in `.env` (e.g. `postgresql://postgres:12345@localhost:5432/sem`):
```bash
# Push schema migrations
pnpm db:migrate

# Seed default organization and master administrative user
pnpm db:bootstrap
```

### 5. Start the Monorepo (Turborepo)
To start both the NestJS API (port 3001) and Next.js Frontend (port 3000) simultaneously:
```bash
pnpm dev
```

Or run individual components:
```bash
pnpm dev:backend   # NestJS API server (@sem/api) on port 3001
pnpm dev:frontend  # Next.js 15 UI on port 3000
pnpm dev:worker    # BullMQ worker (@sem/worker)
```

---

## Health Checks & Diagnostics

- **Liveness probe**:
  ```bash
  curl http://localhost:3001/healthz
  # Response: {"status":"ok","uptime":...}
  ```
- **Readiness probe** (checks DB and Redis connectivity):
  ```bash
  curl http://localhost:3001/readyz
  ```
- **Prometheus Metrics**:
  ```bash
  curl http://localhost:3001/metrics
  ```

---

## Authentication & API Usage

SEM V2 uses standard ES256 Bearer tokens and JSON envelopes `{ success: true, data: ... }`.

### 1. Admin Login (with Master Token)
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"master_token": "<SEM_MASTER_TOKEN>"}'
```
Response:
```json
{
  "success": true,
  "data": {
    "access_token": "<jwt>",
    "refresh_token": "<token>",
    "token_type": "Bearer",
    "expires_in": 900,
    "must_change_password": false
  }
}
```

### 2. User Login (Username + Password)
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"organization": "default", "username": "niranjan", "password": "<password>"}'
```

### 3. List Projects
```bash
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer <access_token>"
```

### 4. Fetch Decrypted Secret Value
```bash
curl http://localhost:3001/api/v1/projects/<projectId>/environments/<envId>/secrets/<KEY>/value \
  -H "Authorization: Bearer <access_token>"
```

---

## Data Migration from V1 (Legacy)

Legacy Fernet files and `.history.jsonl` from `backend_v1/data` can be migrated using the CLI tool:
```bash
# Dry run
pnpm --filter @sem/migrate migrate:dry --data-dir backend_v1/data

# Execute migration into PostgreSQL
pnpm --filter @sem/migrate migrate --execute --data-dir backend_v1/data
```
This migrates:
- Organizations and users
- Projects and environments
- Secrets envelope-encrypted with AES-256-GCM
- Historical encrypted snapshots
- Audit events into `audit_events`
