import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const repoRoot = new URL('../../', import.meta.url)

/**
 * Loads the repository-root `.env` into `process.env`.
 *
 * The whole stack — this app, the Python worker and Docker Compose — reads one
 * `.env` at the root, but Next only looks for env files inside its own project
 * directory (`apps/web`). Without this the server starts and then fails on the
 * first request with `DATABASE_URL is not set`. The CLI scripts under
 * `packages/jobs` solve the same problem with `node --env-file-if-exists`.
 *
 * Variables already present in the environment win, so Docker Compose's
 * `env_file` and any real deployment environment are never overridden.
 */
function loadRootEnv(): void {
  let contents: string
  try {
    contents = readFileSync(new URL('.env', repoRoot), 'utf8')
  } catch {
    return // No .env checked out: leave process.env as it is.
  }

  // Split on CRLF as well as LF: the file is edited on Windows as often as not.
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue

    // Both groups always participate in a match; the defaults are only here to
    // satisfy `noUncheckedIndexedAccess`.
    const [, key = '', rawValue = ''] = match
    if (process.env[key] !== undefined) continue

    const value = rawValue.trim()
    const quote = value[0]
    process.env[key] =
      (quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1
        ? value.slice(1, -1)
        : value
  }
}

loadRootEnv()

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build output, which
  // keeps the monorepo free of an extra build step. Next compiles them for us.
  transpilePackages: [
    '@lasce/config',
    '@lasce/contracts',
    '@lasce/db',
    '@lasce/jobs',
    '@lasce/types',
  ],

  // Produces a self-contained server bundle for infra/docker/web.Dockerfile.
  output: 'standalone',

  // The repository root, so file tracing follows imports across the workspace.
  // `fileURLToPath`, not `URL.pathname`: the latter yields `/C:/...` on Windows,
  // which Turbopack cannot canonicalize.
  outputFileTracingRoot: fileURLToPath(repoRoot),

  // ioredis, BullMQ, the Prisma client and the MinIO SDK are required at
  // runtime instead of being bundled — they carry native or dynamic requires
  // that do not survive it.
  serverExternalPackages: ['ioredis', 'bullmq', '@prisma/client', 'minio'],

  // Next's runtime require-hook loads @swc/helpers' ESM variants through a
  // dynamic require the file tracer cannot see, so standalone output shipped
  // only the two CJS files the tracer resolved statically. The container then
  // died on boot with MODULE_NOT_FOUND for esm/_interop_require_default.js and
  // never bound a port, which read as a healthcheck timeout. Pull the whole
  // package in. pnpm's isolated layout keeps it under .pnpm rather than a
  // hoisted node_modules, and the glob avoids pinning the version.
  outputFileTracingIncludes: {
    '/**': ['../../node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*'],
  },
}

export default nextConfig
