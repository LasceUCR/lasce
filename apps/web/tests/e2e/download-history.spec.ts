import { expect, test } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

const PATH = '/administracion/descargas'

test('requires authentication before showing the download history', async ({ page }) => {
  await page.goto(PATH)
  await expect(page).toHaveURL(/acceso\?next=%2Fadministracion%2Fdescargas&reason=auth/)
  await expect(page.getByRole('table')).toHaveCount(0)
})

test('denies the download history to an assistant and shows no record', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ASSISTANT')
  try {
    await page.goto(PATH)
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  } finally {
    await fixture.cleanup()
  }
})

test('pages the history 10 at a time, filters it and keeps deleted accounts', async ({
  page,
  context,
}) => {
  const admin = await createSignedInUser(context, 'ADMIN')
  const { prisma } = admin
  const former = await prisma.user.create({
    data: {
      institution: 'Institución QA',
      countryCode: 'CR',
      passwordHash: 'x',
      fullName: 'Cuenta pasada QA',
      email: `former-${admin.user.id}@example.com`,
      role: 'VISITOR',
    },
  })
  const tag = admin.user.id
  const base = new Date('2026-01-01T12:00:00Z').getTime()
  const rows = Array.from({ length: 12 }, (_, index) => ({
    userId: index === 0 ? former.id : admin.user.id,
    source: index < 11 ? 'GOES' : 'ROSAC',
    instrument: index < 11 ? 'EXIS' : 'ROSAC-I1',
    product: index < 11 ? 'EXIS-L1b-SFXR' : 'ROSAC-I1',
    format: index % 2 === 0 ? 'csv' : 'png',
    params: { parameter: 'xrsa', date: '2026-01-01', startTime: '00:00', endTime: '23:59' },
    objectKey: `e2e/${tag}/${index}`,
    byteSize: 10,
    expiresAt: new Date(base + 3_600_000),
    createdAt: new Date(base + index * 60_000),
  }))
  try {
    await prisma.resourceDownload.createMany({ data: rows })
    // Only this test's rows: every filter below also pins the date, so other data cannot leak in.
    const window = 'from=2026-01-01&to=2026-01-01'

    await page.goto(`${PATH}?${window}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Descargas' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(11) // header + 10
    await expect(page.getByRole('status')).toContainText('12 descargas')
    await expect(page.getByRole('status')).toContainText('Página 1 de 2')

    await page.goto(`${PATH}?${window}&page=2`)
    await expect(page.getByRole('row')).toHaveCount(3) // header + 2
    await expect(page.getByRole('cell', { name: 'Cuenta eliminada' })).toHaveCount(0)

    // A page far past the end, and a bad value, both land on a real page.
    await page.goto(`${PATH}?${window}&page=7`)
    await expect(page.getByRole('status')).toContainText('Página 2 de 2')
    await page.goto(`${PATH}?${window}&page=abc`)
    await expect(page.getByRole('status')).toContainText('Página 1 de 2')

    await page.goto(`${PATH}?${window}&source=ROSAC`)
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.getByRole('status')).toContainText('1 descarga')

    await prisma.user.delete({ where: { id: former.id } })
    await page.goto(`${PATH}?${window}&page=2`)
    await expect(page.getByRole('cell', { name: 'Cuenta eliminada' })).toHaveCount(1)

    await page.goto(`${PATH}?from=2001-01-01&to=2001-01-02`)
    await expect(page.getByText('Ninguna descarga coincide con los filtros.')).toBeVisible()
  } finally {
    await prisma.resourceDownload.deleteMany({
      where: { objectKey: { startsWith: `e2e/${tag}/` } },
    })
    await prisma.user.deleteMany({ where: { id: former.id } })
    await admin.cleanup()
  }
})
