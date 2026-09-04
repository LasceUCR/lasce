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

# NEXT_PUBLIC_* is inlined by the compiler, and app/lib/site.ts feeds this to
# metadataBase, robots.ts and sitemap.ts, all evaluated during `next build`.
# A runtime variable would be too late, so it has to arrive as a build arg.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# packages/db constructs its PrismaClient at module scope, and `next build`
# imports every route module to read its segment config, so these have to be
# present and parseable. Nothing ever connects to them.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    REDIS_URL=redis://127.0.0.1:6379 \
    CRON_SECRET=build-time-placeholder \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages ./packages
COPY . .
RUN pnpm --filter @lasce/db generate \
 && pnpm --filter @lasce/web build

# --- migrator -----------------------------------------------------------------
# A flat, npm-installed Prisma CLI for the Railway pre-deploy command. npm and
# not pnpm: `node-linker=isolated` produces symlinks into a root .pnpm store,
# which cannot be lifted into another stage on their own.
FROM base AS migrator
WORKDIR /migrator
RUN npm init -y > /dev/null \
 && npm install --no-audit --no-fund prisma@7.9.1 dotenv@17.2.3

# --- runtime ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=:: \
    HOME=/tmp \
    PRISMA_HIDE_UPDATE_MESSAGE=true

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: 'standalone'` plus `outputFileTracingRoot` produces a tree rooted at
# the repository, so the server lives at apps/web/server.js.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
# `standalone` does not include public/, so without this every brand asset,
# including the favicon tests/e2e/accessibility-seo.spec.ts asserts on, 404s.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# Everything `prisma migrate deploy` needs, for the Railway pre-deploy command:
#   sh -c "cd /repo/migrator && node node_modules/prisma/build/index.js migrate deploy"
COPY --from=migrator --chown=nextjs:nodejs /migrator/node_modules ./migrator/node_modules
COPY --from=migrator --chown=nextjs:nodejs /migrator/package.json ./migrator/package.json
COPY --from=builder  --chown=nextjs:nodejs /repo/packages/db/prisma ./migrator/prisma
COPY --chown=nextjs:nodejs packages/db/prisma.config.ts ./migrator/prisma.config.ts

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
