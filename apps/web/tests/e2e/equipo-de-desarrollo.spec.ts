import { expect, test } from '@playwright/test'

const emails = [
  'isabellarodriguez18@gmail.com',
  'cascante.aldo@gmail.com',
  'gipsyparamolopez@gmail.com',
  'cerdasignacio5@gmail.com',
  'sebastian@bolanos.cr',
  'andresmimi@gmail.com',
  'dev.josue.torres@gmail.com',
  'contact@savaldev.com',
  'serranogabo10@gmail.com',
]

test('opens directly without a login redirect and shows the team and background', async ({
  page,
}) => {
  const response = await page.goto('/equipo-de-desarrollo')

  expect(response?.status()).toBe(200)
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
  await expect(page.getByRole('heading', { level: 1, name: 'Equipo de desarrollo' })).toBeVisible()

  for (const email of emails) {
    await expect(
      page.getByRole('link', { name: new RegExp(email.replace('.', '\\.')) }),
    ).toHaveAttribute('href', `mailto:${email}`)
  }

  await expect(page.getByRole('region', { name: 'Contexto del proyecto' })).toContainText(
    'Origen y motivación',
  )
  await expect(page).toHaveTitle('Equipo de desarrollo | LASCE')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/equipo-de-desarrollo$/,
  )
})

test('is reached from the footer and returns to the landing page', async ({ page }) => {
  await page.goto('/')

  await page
    .getByRole('navigation', { name: 'Enlaces del pie de página' })
    .getByRole('link', { name: 'Equipo de desarrollo' })
    .click()
  await expect(page).toHaveURL(/\/equipo-de-desarrollo$/)

  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page).toHaveURL(/\/$/)
})

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`fits the ${viewport.name} viewport without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/equipo-de-desarrollo')

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )
    expect(fits).toBe(true)
  })
}
