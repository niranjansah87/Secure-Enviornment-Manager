# SEM v2 Frontend Architecture

## Goal

Build a maintainable, production-quality Next.js frontend around the SEM product model while the backend is being redesigned independently.

The frontend must be ready to integrate with the new backend without spreading API assumptions across UI components.

## Principles

1. UI components should not contain raw API implementation.
2. Authentication and authorization concerns should be centralized.
3. Server data and local UI state should be clearly separated.
4. Sensitive values must have explicit handling boundaries.
5. Every async workflow must support loading, success, empty and error states.
6. Pages should be composed from reusable product primitives.
7. Heavy visual features should be lazy-loaded.

## Suggested Structure

```text
src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (app)/
│   └── ...
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── tables/
│   ├── dialogs/
│   ├── security/
│   └── visualization/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   ├── secrets/
│   ├── compare/
│   ├── history/
│   ├── audit/
│   ├── templates/
│   ├── analytics/
│   ├── api-keys/
│   └── users/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── security/
│   ├── validation/
│   └── utils/
├── hooks/
├── types/
└── styles/
```

Adapt this to the existing repository rather than mechanically moving files.

## API Boundary

Create a centralized typed API layer.

UI components should call feature services/hooks rather than raw fetch calls.

When the backend API changes, only the integration layer should need substantial changes.

## Authentication

Centralize:
- session restoration
- logout
- token lifecycle
- expiry handling
- protected routes
- authentication state

Do not scatter authentication logic through individual pages.

## Authorization

UI visibility should reflect permissions, but UI hiding is not a security boundary.

Handle:
- admin-only routes
- scoped developer access
- forbidden responses
- expired sessions

## Sensitive Data

Secrets must be masked by default.

Do not persist plaintext secret values unnecessarily in client state.

Do not log sensitive values.

## Routing

All routes must support:
- direct navigation
- refresh
- protected access
- invalid routes
- meaningful loading states
- error boundaries

## Error Architecture

Provide:
- global error boundary
- route-level error handling
- reusable error UI
- retry behavior where appropriate
- custom 404

Never expose stack traces or backend internals.

## SEO

Public pages should have:
- title
- description
- canonical URL
- Open Graph metadata
- semantic headings
- sitemap/robots handling where appropriate

Authenticated/private pages should not be indexed.

## Performance

Use:
- dynamic imports for heavy visualizations
- image optimization
- route-level code splitting
- appropriate memoization
- virtualization for genuinely large tables

Do not load Three.js or heavy charts on pages that do not use them.

## Testing

At minimum cover:
- authentication
- protected routing
- permissions
- secret workflows
- project/environment navigation
- compare
- history
- audit
- API keys
- users
- critical dialogs

Run typecheck, lint, tests and production build before completion.
