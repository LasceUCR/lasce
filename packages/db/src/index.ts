import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/client/client.js'

export * from '../generated/client/client.js'

/**
 * A single PrismaClient for the process.
 *
 * Prisma 7 connects through a driver adapter rather than a `url` in the schema,
 * so the connection string is read here. Next.js recreates modules on every hot
 * reload in development, which would otherwise open a new connection pool each
 * time until PostgreSQL refuses more — stashing the instance on `globalThis`
 * keeps exactly one alive.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
