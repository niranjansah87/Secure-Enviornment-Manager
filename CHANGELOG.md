# Changelog

All notable changes to Secure Environment Manager (SEM) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive unit test coverage across `@sem/crypto`, `@sem/sdk`, `@sem-org/sem-cli`, and `frontend`.
- GitHub Actions CI workflow covering full monorepo build, lint, typecheck, and unit testing matrix.
- Production multi-stage `Dockerfile` and top-level `docker-compose.yml` for unified self-hosting.
- `.github/dependabot.yml` automated dependency update tracking.
- Contributor Covenant Code of Conduct (`CODE_OF_CONDUCT.md`), Project Governance (`GOVERNANCE.md`), and Support Guide (`SUPPORT.md`).

### Fixed
- Fixed Next.js 16 Turbopack compatibility by establishing PostCSS `@tailwindcss/postcss` plugin and standalone deployment targets.
- Resolved type variance issues in Tailwind theme configurations.
- Fixed cross-platform home directory resolution in `@sem-org/sem-cli` for Windows and Linux environments.
- Eliminated lingering merge conflict markers in package configurations.
- Removed legacy unmaintained Python and Flutter workflows from CI scanning.

### Security
- Purged tracked runtime session state and hardened `.gitignore` against accidental session, key, and database tracking.
- Bound all secret ciphertexts to resource locations using AES-256-GCM Additional Authenticated Data (AAD).
- Enforced algorithm whitelisting in ES256 JWT validation to prevent algorithm confusion attacks.

---

## [2.0.0] - 2026-10-16

### Added
- Complete architecture migration to a high-performance TypeScript monorepo powered by pnpm and Turborepo.
- NestJS + Fastify REST and WebSocket API (`@sem/api`) with sub-millisecond route dispatching.
- Modern Next.js 16 App Router frontend with real-time secret synchronization and dark theme UI.
- Envelope encryption engine (`@sem/crypto`) utilizing AES-256-GCM with hierarchical Master Key -> Project KEK -> Environment DEK wrapping.
- Standalone TypeScript SDK (`@sem/sdk`) and interactive terminal CLI (`@sem-org/sem-cli`).
- Asymmetric authentication using ECDSA P-256 (ES256) JWTs with single-use refresh token rotation and reuse detection.
- Memory-hard Argon2id password hashing with timing-attack mitigations.
- Automated DEK rotation scheduler and background worker (`@sem/worker`) backed by BullMQ.
- Immutable audit logging tracking actor, timestamp, IP, and resource IDs for all state-changing operations.
- Environment snapshots, rollback capabilities, and cross-environment visual diffing.

---

## [1.0.0] - 2026-04-04

### Added
- Initial reference implementation of Secure Environment Manager using Python Flask and Fernet symmetric encryption.
- SQLite database storage for encrypted environment variables.
- Basic Bearer token authentication and namespace scoping.

