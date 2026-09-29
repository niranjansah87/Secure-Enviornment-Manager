FROM node:22-alpine AS base
RUN corepack enable pnpm

# ── dependency layer (cache-friendly) ────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages/types/package.json   packages/types/package.json
COPY packages/crypto/package.json  packages/crypto/package.json
COPY packages/sdk/package.json     packages/sdk/package.json
COPY apps/api/package.json         apps/api/package.json
RUN pnpm install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules            ./node_modules
COPY --from=deps /app/packages/types/node_modules   packages/types/node_modules
COPY --from=deps /app/packages/crypto/node_modules  packages/crypto/node_modules
COPY --from=deps /app/apps/api/node_modules   apps/api/node_modules
COPY packages/types/   packages/types/
COPY packages/crypto/  packages/crypto/
COPY apps/api/         apps/api/
COPY pnpm-workspace.yaml turbo.json package.json ./
RUN pnpm --filter @sem/types build \
 && pnpm --filter @sem/crypto build \
 && pnpm --filter @sem/api build

# ── standalone deploy bundle ─────────────────────────────────────────────────
FROM base AS deploy
WORKDIR /app
COPY --from=builder /app ./
RUN pnpm deploy --filter @sem/api --prod /deploy

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN addgroup -S sem && adduser -S sem -G sem
WORKDIR /app

COPY --from=deploy --chown=sem:sem /deploy ./
# workspace packages are resolved by pnpm deploy into node_modules; copy built dist
COPY --from=builder --chown=sem:sem /app/packages/types/dist  ./node_modules/@sem/types/dist
COPY --from=builder --chown=sem:sem /app/packages/crypto/dist ./node_modules/@sem/crypto/dist

USER sem
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
