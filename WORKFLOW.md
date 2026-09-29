# Development Workflow — SEM V2

## Local development

```bash
# Start infra
docker compose -f docker-compose.v2.yml up -d postgres redis

# Install all workspace packages
pnpm install

# Run migrations
pnpm --filter @sem/api db:migrate

# Start API (hot reload)
pnpm --filter @sem/api dev          # http://localhost:3001

# Start worker
pnpm --filter @sem/worker dev

# Start frontend
pnpm --filter @sem/web dev          # http://localhost:3000
```

Health check: `curl http://localhost:3001/api/v1/health`

## Generate key material

```bash
pnpm --filter @sem/api tsx src/scripts/generate-keys.ts
```

Outputs: `SEM_MASTER_KEY`, `SEM_TOKEN_HMAC_KEY`, `SEM_JWT_PRIVATE_KEY`, `SEM_JWT_PUBLIC_KEY`.

## Run tests

```bash
# Crypto unit tests (no infra needed)
pnpm --filter @sem/crypto test

# Integration tests (postgres + redis required)
pnpm --filter @sem/api test:integration

# Typecheck all packages
pnpm typecheck
```

## Build

```bash
pnpm build                          # builds all packages + apps via turborepo
```

## Docker stack

```bash
# Build + start full stack
docker compose -f docker-compose.v2.yml up --build -d

# Tail logs
docker compose -f docker-compose.v2.yml logs -f api worker

# Stop
docker compose -f docker-compose.v2.yml down
```

## Database migrations

Migrations live in `apps/api/src/infra/database/migrations/`. They are plain SQL files, numbered sequentially (`0001_`, `0002_`, …).

```bash
# Apply all pending migrations
pnpm --filter @sem/api db:migrate

# Generate a new migration after schema changes
pnpm --filter @sem/api db:generate
```

Never modify an existing migration. Always add a new file.

## V1 → V2 migration

```bash
# Dry run first
SEM_V1_ENCRYPTION_KEY=<fernet-key> \
DATABASE_URL=<v2-pg-url> \
SEM_MASTER_KEY=<v2-master-key> \
  pnpm --filter @sem/migrate migrate:dry --data-dir /path/to/v1/data

# Execute when satisfied
SEM_V1_ENCRYPTION_KEY=<fernet-key> \
DATABASE_URL=<v2-pg-url> \
SEM_MASTER_KEY=<v2-master-key> \
  pnpm --filter @sem/migrate migrate --execute --data-dir /path/to/v1/data
```

## Commit conventions

`type(scope): summary` — types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`, `build`, `ci`.

## Branch strategy

- `main` — production-ready
- `enhacement` — current V2 development branch (merge to main when stable)
