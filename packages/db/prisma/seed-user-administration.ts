/** Optional, local-only fixtures. Never resets or overwrites an existing account. */
import { randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { hashPassword } from '../../../apps/web/app/lib/auth/password'

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('Test accounts may only be created in a local database')
}
const { prisma } = await import('../src/index')
const { UserRole } = await import('../generated/client/enums')
const suffix = randomUUID().slice(0, 8)
const password = randomBytes(18).toString('base64url')
const passwordHash = await hashPassword(password)
try {
  const roles = [...Object.values(UserRole), null]
  const users = await prisma.$transaction(
    roles.map((role) =>
      prisma.user.create({
        data: {
          fullName: `Prueba ${role ?? 'sin rol'}`,
          email: `qa-${(role ?? 'none').toLowerCase()}-${suffix}@example.com`,
          institution: 'Institución de prueba',
          countryCode: 'CR',
          passwordHash,
          role,
        },
        select: { email: true, role: true },
      }),
    ),
  )
  console.log(JSON.stringify({ users, password }, null, 2))
} finally {
  await prisma.$disconnect()
}
