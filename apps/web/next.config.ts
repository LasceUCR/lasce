import type { NextConfig } from 'next'

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
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,

  // ioredis, BullMQ and the Prisma client are required at runtime instead of
  // being bundled — they carry native or dynamic requires that do not survive it.
  serverExternalPackages: ['ioredis', 'bullmq', '@prisma/client'],
}

export default nextConfig
