import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`opens ROSAC through the existing radio astronomy card and returns to the access cards at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const areas = page.getByRole('region', { name: 'Áreas y accesos principales' })
    await expect(areas.getByRole('link')).toHaveCount(6)
    const rosacLink = areas.getByRole('link', {
      name: /^Radioastronomía/,
    })
    await expect(rosacLink).toHaveAttribute('href', '/radioastronomia')
    await rosacLink.click()

    await expect(page).toHaveURL(/\/radioastronomia$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Radioastronomía' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)

    await page.getByRole('link', { name: 'Volver a las áreas y accesos principales' }).click()
    await expect(page).toHaveURL(/\/#areas-de-trabajo$/)
    await expect(areas).toBeInViewport()
  })
}

test('serves the general information and LASCE relationship directly without authentication', async ({
  page,
}) => {
  const response = await page.goto('/radioastronomia')

  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/radioastronomia$/)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('region', { name: '¿Qué es ROSAC?' })).toContainText(
    'observar el Sol y otras fuentes celestes',
  )
  await expect(page.getByRole('heading', { name: 'Antena de 11 metros' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Entre 100 y 1000 MHz' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Santa Cruz, Guanacaste' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'ROSAC y LASCE' })).toContainText(
    'LASCE convierte observaciones en conocimiento',
  )
  await expect(page).toHaveTitle('Radioastronomía y ROSAC | LASCE')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/radioastronomia$/)
})

test('keeps the scientific consultation button enabled and without a destination', async ({
  page,
}) => {
  await page.goto('/radioastronomia')

  const consultation = page.getByRole('region', { name: 'Consulta científica' })
  await expect(consultation.getByText('Próximamente')).toHaveCount(0)
  const button = consultation.getByRole('button', { name: 'Consultar información científica' })
  await expect(button).toBeEnabled()
  await expect(button).not.toHaveAttribute('href')
  await expect(consultation.getByRole('link')).toHaveCount(0)
})

test('keeps ROSAC access out of the shared navigation and instrumentation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').getByRole('link', { name: /ROSAC/ })).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: /ROSAC/ })).toHaveCount(0)

  await page.goto('/instrumentacion')
  await expect(page.getByRole('heading', { level: 1, name: 'Instrumentación' })).toBeVisible()
  await expect(page.getByRole('link', { name: /ROSAC/ })).toHaveCount(0)
})

test('the skip link focuses ROSAC content', async ({ page }) => {
  await page.goto('/radioastronomia')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})
