# Contributing to Secure Environment Manager

Thank you for your interest in contributing to Secure Environment Manager (SEM)!

This guide explains our monorepo architecture, development environment setup, coding and security standards, and our pull request process.

---

## 1. Code of Conduct

All contributors are expected to uphold the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). Please report any unacceptable behavior confidentially to `niranjansah250@gmail.com`.

---

## 2. Architecture & Monorepo Structure

SEM is structured as a TypeScript monorepo managed with **pnpm workspaces** and **Turborepo**:

```text
Secure-Environment-Manager/
├── backend/            # Fastify + NestJS API (@sem/api, port 3001)
├── frontend/           # Next.js 16 App Router application (port 3000)
├── worker/             # BullMQ background worker for key rotation & tasks
├── cli/                # Command-line tool (@sem-org/sem-cli, executable 'sem')
├── packages/
│   ├── crypto/         # AES-256-GCM envelope encryption & token helpers (@sem/crypto)
│   ├── sdk/            # Official TypeScript client library (@sem/sdk)
│   └── types/          # Shared domain DTOs, schemas, and interfaces (@sem/types)
├── tools/
│   └── migrate/        # Data migration utilities
├── docker-compose.yml  # Production & local stack (Postgres 16, Redis 7, API, Frontend)
└── .github/workflows/  # CI/CD and security automation
```

---

## 3. Local Development Setup

### Prerequisites
- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 9.0.0` (`corepack enable pnpm`)
- **Docker & Docker Compose**: Optional for running local Postgres 16 and Redis 7

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/niranjansah87/Secure-Environment-Manager.git
   cd Secure-Environment-Manager
   ```

2. **Install all workspace dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Generate cryptographic keys (JWT ES256 and Master Key):**
   ```bash
   pnpm keys:generate
   ```
   This automatically injects required development keys into your `.env` (which is excluded from Git tracking).

5. **Start local backing services (PostgreSQL & Redis):**
   ```bash
   docker compose up postgres redis -d
   ```

6. **Run database migrations and seed default administrator:**
   ```bash
   pnpm db:migrate
   pnpm db:bootstrap
   ```

7. **Start all development services:**
   ```bash
   pnpm dev
   ```
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)
   - **Healthcheck**: `curl http://localhost:3001/healthz`

---

## 4. Development Workflow & Commands

We use Turborepo to orchestrate tasks across all packages:

| Command | Description |
| :--- | :--- |
| `pnpm build` | Compiles all TypeScript packages and the Next.js application |
| `pnpm dev` | Starts API, Frontend, and Worker with live reload |
| `pnpm typecheck` | Runs `tsc --noEmit` across all packages |
| `pnpm lint` | Runs ESLint across API, CLI, and Frontend |
| `pnpm test:unit` | Executes all unit test suites (Vitest) |
| `pnpm test:integration` | Runs API integration tests against database |
| `pnpm keys:generate` | Generates fresh AES-256 and ES256 keys |

---

## 5. Security & Engineering Standards

Because SEM handles sensitive secrets, all contributions must adhere to strict security practices:

### Never Commit Sensitive Data
- Never commit `.env`, `.env.local`, API keys, session dumps, tokens, private keys, or actual secret values.
- Verify `git status` before committing.

### Cryptographic Rules
- Always use authenticated encryption (**AES-256-GCM**) from `@sem/crypto`. Never use unauthenticated ciphers.
- Always include Additional Authenticated Data (AAD) binding ciphertexts to their resource paths (`org:project:env:key`).
- Nonces must be generated using `crypto.randomBytes(12)` and never reused.
- Passwords must be hashed using `argon2id`.
- Tokens must be compared using constant-time comparison (`safeCompare`).

### Tenant Isolation & Authorization
- Every state-changing backend route must extract the tenant ID (`orgId`) from verified JWT claims (`@CurrentUser()`), never from client input.
- Scopes must be declared via `@RequireScopes()` and validated on the backend.

---

## 6. Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```text
<type>(<scope>): <subject>
```

- `feat`: A new user-facing or API feature
- `fix`: A bug fix
- `docs`: Documentation updates
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `chore`: Tooling, dependency, or configuration updates

**Example:**
```bash
git commit -m "feat(crypto): bind secret ciphertexts to environment identifier via AAD"
```

---

## 7. Submitting a Pull Request

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/add-secret-tagging
   ```
2. Verify all quality gates pass locally before opening a PR:
   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   pnpm test:unit
   ```
3. Open a Pull Request targeting `main`. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) completely.
4. CI checks must pass before maintainer review.
