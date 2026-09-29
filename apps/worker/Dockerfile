FROM node:22-alpine AS base
RUN corepack enable pnpm

# ── dependency layer ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages/types/package.json   packages/types/package.json
COPY packages/crypto/package.json  packages/crypto/package.json
COPY apps/worker/package.json      apps/worker/package.json
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules             ./node_modules
COPY --from=deps /app/packages/types/node_modules   packages/types/node_modules
COPY --from=deps /app/packages/crypto/node_modules  packages/crypto/node_modules
COPY --from=deps /app/apps/worker/node_modules apps/worker/node_modules
COPY packages/types/   packages/types/
COPY packages/crypto/  packages/crypto/
COPY apps/worker/      apps/worker/
COPY pnpm-workspace.yaml turbo.json package.json ./
RUN pnpm --filter @sem/types build \
 && pnpm --filter @sem/crypto build \
 && pnpm --filter @sem/worker build

# ── standalone deploy bundle ──────────────────────────────────────────────────
FROM base AS deploy
WORKDIR /app
COPY --from=builder /app ./
RUN pnpm deploy --filter @sem/worker --prod /deploy

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN addgroup -S sem && adduser -S sem -G sem
WORKDIR /app

COPY --from=deploy --chown=sem:sem /deploy ./
COPY --from=builder --chown=sem:sem /app/packages/types/dist  ./node_modules/@sem/types/dist
COPY --from=builder --chown=sem:sem /app/packages/crypto/dist ./node_modules/@sem/crypto/dist

USER sem
# Worker has no HTTP server — no EXPOSE, no HEALTHCHECK port
CMD ["node", "dist/main.js"]
