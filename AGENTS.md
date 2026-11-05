# AGENTS.md — AI Agent Collaboration & Codex Guidelines

This document governs autonomous and assistant AI coding agents (including OpenAI Codex, Anthropic Claude, and pairs) working on Secure Environment Manager (SEM).

---

## 1. Repository Architecture & Entry Points

SEM is a high-performance developer secrets management monorepo managed with `pnpm` and Turborepo.

| Component | Package Name | Path | Technology & Port |
| :--- | :--- | :--- | :--- |
| **Backend API** | `@sem/api` | `backend/` | NestJS + Fastify REST & WebSocket (port 3001) |
| **Frontend UI** | `frontend` | `frontend/` | Next.js 16 App Router, React 19, Tailwind CSS (port 3000) |
| **Background Worker**| `@sem/worker` | `worker/` | BullMQ worker for DEK rotation & tasks |
| **CLI Tool** | `@sem-org/sem-cli` | `cli/` | Commander.js terminal client (`bin/sem.js`) |
| **Crypto Engine** | `@sem/crypto` | `packages/crypto/` | AES-256-GCM envelope encryption & token HMACs |
| **TypeScript SDK** | `@sem/sdk` | `packages/sdk/` | Type-safe client library with auto-refresh |
| **Shared Types** | `@sem/types` | `packages/types/` | DTOs, schemas, and shared domain models |

---

## 2. Core Development Commands

AI agents must use these standardized commands for testing and validation:

```bash
# Build & Compilation
pnpm build              # Compiles all TypeScript packages and Next.js app
pnpm --filter <pkg> build

# Type Checking
pnpm typecheck          # Runs tsc --noEmit across all workspace packages

# Linting & Code Style
pnpm lint               # Executes ESLint across API, CLI, and Frontend

# Automated Testing
pnpm test:unit          # Runs all Vitest unit tests (crypto, api, sdk, cli, frontend)
pnpm test:integration   # Runs NestJS database integration tests against Postgres

# Database & Key Generation
pnpm keys:generate      # Generates fresh dev ES256 and AES-256 keys into ignored .env
pnpm db:migrate         # Applies Drizzle SQL migrations
pnpm db:bootstrap       # Provisions default master administrative account
```

---

## 3. Security Rules & Boundaries for AI Agents

SEM is developer security infrastructure. The following rules are non-negotiable:

1. **Zero Secret Ingestion**: AI agents must NEVER receive, process, or commit real API tokens, private keys, database passwords, or production secrets. Use dummy placeholders (e.g. `AAAA...`) during testing.
2. **Authenticated Encryption Only**: Never downgrade cryptographic algorithms. All secret values must be encrypted using `encryptValue` from `@sem/crypto` with AES-256-GCM, a fresh 12-byte random nonce, and resource-bound AAD (`org:project:env:key`).
3. **Tenant Scoping**: All database queries and modifications must derive the organization tenant (`orgId`) directly from verified JWT claims (`@CurrentUser()`). Never trust client-supplied tenant parameters.
4. **No Destructive History Rewrites**: Never run `git push --force` or rewrite public git history without explicit human maintainer authorization.
5. **No Mocked Test Cheating**: Never remove test assertions or create hollow mocks to force CI to pass. Fix the root cause in the source code.

---

## 4. Coding Standards

### Backend (`@sem/api`)
- Use NestJS controllers, providers, and modules with Fastify adapter.
- Validate all incoming HTTP payloads using `class-validator` DTOs.
- Annotate required RBAC scopes with `@RequireScopes('secrets:read')`.
- Emit structured audit log events via `AuditService.writeEvent` on all mutations.

### Frontend (`frontend`)
- Next.js 16 App Router with React functional components and hooks.
- Handle API failures through `translateError` (`frontend/src/lib/error-translation.ts`) and present user-friendly feedback via `sonner` toasts.
- Follow dark-theme system tokens (#07090E background).

### SDK & CLI (`@sem/sdk`, `@sem-org/sem-cli`)
- SDK must support both API key (`sem_<id>_<secret>`) and username/password authentication with transparent token refresh.
- CLI must use cross-platform paths (`os.homedir()`) and output structured JSON, tables, or plaintext as requested.

---

## 5. Codex-Assisted Maintenance Workflows

### Workflow A: Pull Request Security & Quality Review
When reviewing a PR:
1. Verify no `.env`, session dumps, or credentials are added.
2. Run `pnpm build && pnpm typecheck && pnpm lint && pnpm test:unit`.
3. Check for tenant isolation: ensure all queries filter by verified `orgId`.
4. Check cryptographic boundaries: confirm nonces are never hardcoded or reused.

### Workflow B: Security Regression Testing
When modifying auth or crypto logic:
1. Execute `pnpm --filter @sem/crypto test` and `pnpm --filter @sem/api test:unit`.
2. Verify token tampering, algorithm confusion (HS256/none), and expired tokens are rejected.
3. Verify refresh token reuse triggers immediate session invalidation.

### Workflow C: Dependency Updates & Audits
1. Run `pnpm audit --audit-level=high`.
2. Ensure pinned workspace package dependencies remain compatible.
3. Test full build and unit tests before committing lockfile updates.

### Workflow D: Release Preparation
1. Check that `CHANGELOG.md` reflects all changes under `[Unreleased]`.
2. Ensure version consistency across `package.json` files using SemVer rules.
3. Validate Docker builds (`docker compose build`).
