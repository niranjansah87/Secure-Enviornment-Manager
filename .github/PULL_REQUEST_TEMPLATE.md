## Summary
<!-- Provide a brief explanation of what this pull request does. -->

## Motivation & Context
<!-- Why is this change necessary? What problem or user story does it address? Link related issue: Fixes #(issue) -->

## Key Changes
<!-- Bullet-point breakdown of architectural or implementation changes. -->
- 

## Affected Components
<!-- Select all that apply: -->
- [ ] `@sem/api` (Backend Fastify/NestJS API)
- [ ] `frontend` (Next.js Application)
- [ ] `@sem/crypto` (Envelope encryption & key utilities)
- [ ] `@sem/sdk` (TypeScript SDK)
- [ ] `@sem-org/sem-cli` (Command-line tool)
- [ ] `@sem/worker` (BullMQ maintenance worker)
- [ ] Documentation / CI / Infrastructure

## Testing & Verification
<!-- How did you verify these changes? State which tests were executed. -->
- [ ] Workspace builds cleanly (`pnpm build`)
- [ ] Typecheck passes across all packages (`pnpm typecheck`)
- [ ] Linter passes across all packages (`pnpm lint`)
- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] Integration tests pass (if modifying backend/database logic)
- [ ] Manual test description:

## Security Implications
<!-- Does this change modify authentication, authorization, session management, or cryptographic routines? -->
- [ ] No security impact
- [ ] Modifies cryptographic logic (explain verification below)
- [ ] Modifies auth/RBAC logic (explain isolation guarantees below)
- Explanation: 

## Breaking Changes
- [ ] None (fully backward-compatible)
- [ ] Yes (explain breaking changes and migration guide below)

## Checklist
- [ ] My code adheres to the project's coding and security standards.
- [ ] I have not committed any credentials, tokens, or runtime state.
- [ ] Relevant documentation has been updated.
