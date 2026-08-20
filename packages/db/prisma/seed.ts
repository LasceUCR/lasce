/**
 * Minimal seed so the demo page has something to show on a fresh database.
 * Run with `pnpm --filter @lasce/db seed`.
 */
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

const { prisma } = await import('../src/index.js')

const devices = [
  { externalId: 'device-001', name: 'Boiler room sensor', location: 'Plant A / Basement' },
  { externalId: 'device-002', name: 'Cold storage sensor', location: 'Plant A / Warehouse' },
  { externalId: 'device-003', name: 'Rooftop weather station', location: 'Plant B / Roof' },
]

for (const device of devices) {
  await prisma.device.upsert({
    where: { externalId: device.externalId },
    update: device,
    create: device,
  })
  console.log(`seeded device ${device.externalId}`)
}

await prisma.$disconnect()
