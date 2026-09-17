import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { existsSync } from 'node:fs'
import type { BrowserContext } from '@playwright/test'
import type { PrismaClient, User } from '@lasce/db'
import { encodeAccountCookie } from '@/app/lib/auth/account'
import { hashPassword } from '@/app/lib/auth/password'
import { generateSessionToken, hashSessionToken, sessionExpiry } from '@/app/lib/auth/session-token'

const envPath = path.resolve(process.cwd(), '../../.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

interface AdminFixture {
  prisma: PrismaClient
  admin: User
  target: User
  cleanup: () => Promise<{ count: number }>
}

async function attachBrowserSession(
  context: BrowserContext,
  user: Pick<User, 'id' | 'fullName' | 'role'>,
) {
  const { prisma } = await import('@lasce/db')
  const token = generateSessionToken()
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: sessionExpiry() },
  })
  await context.addCookies([
    {
      name: 'lasce_session',
      value: token,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'lasce_account',
      value: encodeAccountCookie({ name: user.fullName, role: user.role }),
      url: 'http://localhost:3000',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])
}

export async function createSignedInUser(
  context: BrowserContext,
  role: User['role'],
): Promise<{ prisma: PrismaClient; user: User; cleanup: () => Promise<{ count: number }> }> {
  const { prisma } = await import('@lasce/db')
  const suffix = randomUUID()
  const user = await prisma.user.create({
    data: {
      institution: 'Institución QA',
      countryCode: 'CR',
      passwordHash: await hashPassword(randomUUID()),
      fullName: `Usuario ${role ?? 'sin rol'} QA`,
      email: `user-${role ?? 'none'}-${suffix}@example.com`,
      role,
    },
  })
  await attachBrowserSession(context, user)
  return {
    prisma,
    user,
    cleanup: () => prisma.user.deleteMany({ where: { id: user.id } }),
  }
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
  await attachBrowserSession(context, admin)
  return {
    prisma,
    admin,
    target,
    cleanup: () => prisma.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } }),
  }
}
