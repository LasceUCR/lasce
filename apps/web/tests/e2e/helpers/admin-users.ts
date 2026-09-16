import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { existsSync } from 'node:fs'
import type { BrowserContext } from '@playwright/test'
import type { PrismaClient, User } from '@lasce/db'
import { generateSessionToken, hashSessionToken, sessionExpiry } from '@/app/lib/auth/session-token'
import { hashPassword } from '@/app/lib/auth/password'

const envPath = path.resolve(process.cwd(), '../../.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

interface AdminFixture {
  prisma: PrismaClient
  admin: User
  target: User
  cleanup: () => Promise<{ count: number }>
}

export async function createAdminFixture(context: BrowserContext): Promise<AdminFixture> {
  const { prisma } = await import('@lasce/db')
  const suffix = randomUUID()
  const passwordHash = await hashPassword(randomUUID())
  const fields = { institution: 'Institución QA', countryCode: 'CR', passwordHash }
  const admin = await prisma.user.create({
    data: {
      ...fields,
      fullName: 'Administrador QA',
      email: `admin-${suffix}@example.com`,
      role: 'ADMIN',
    },
  })
  const target = await prisma.user.create({
    data: {
      ...fields,
      fullName: 'Usuario QA',
      email: `user-${suffix}@example.com`,
      role: 'VISITOR',
    },
  })
  const token = generateSessionToken()
  await prisma.session.create({
    data: { userId: admin.id, tokenHash: hashSessionToken(token), expiresAt: sessionExpiry() },
  })
  await context.addCookies([
    {
      name: 'lasce_session',
      value: token,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  return {
    prisma,
    admin,
    target,
    cleanup: () => prisma.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } }),
  }
}
