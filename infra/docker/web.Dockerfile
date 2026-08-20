# syntax=docker/dockerfile:1
#
# Build context is the repository root:
#   docker build -f infra/docker/web.Dockerfile .

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- dependencies -------------------------------------------------------------
# Only the manifests are copied first, so the install layer is reused whenever
# source files change but dependencies do not.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/jobs/package.json packages/jobs/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

# --- build --------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages ./packages
COPY . .
RUN pnpm --filter @lasce/db generate \
 && pnpm --filter @lasce/web build

# --- runtime ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: 'standalone'` plus `outputFileTracingRoot` produces a tree rooted at
# the repository, so the server lives at apps/web/server.js.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
