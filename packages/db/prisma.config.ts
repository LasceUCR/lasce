import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer reads .env automatically, and ours lives at the repository
// root rather than next to this package, so point dotenv at it explicitly.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Falls back to an empty string so `prisma generate` still works without a
    // database URL (it does not need to connect).
    url: process.env.DATABASE_URL ?? '',
  },
})
