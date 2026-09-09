import { expect, test } from '@playwright/test'

test('opens the administration page directly, like every other public route', async ({ page }) => {
  const response = await page.goto('/administracion')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/administracion')
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  await expect(page.getByText('Panel de administración')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
  await expect(page.getByRole('complementary', { name: 'Información provisional' })).toBeVisible()
})

test('shows the summary stats and infrastructure status panels', async ({ page }) => {
  await page.goto('/administracion')

  await expect(page.getByText('Investigadores')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Actividad reciente' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Servicios' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Tareas y pipelines' })).toBeVisible()
})

test('reaches the section from the main navigation and marks it as current', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })
  const link = navigation.getByRole('link', { name: 'Administración', exact: true })

  await link.click()

  await expect(page).toHaveURL(/\/administracion$/)
  await expect(link).toHaveAttribute('aria-current', 'page')
})

test('keeps the header tab current while browsing the other sidebar sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/administracion')

  const sidebar = page.getByRole('navigation', { name: 'Panel de administración' })
  const headerLink = page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Administración', exact: true })

  for (const [label, heading] of [
    ['Descargas', 'Descargas'],
    ['Usuarios', 'Usuarios'],
    ['Infraestructura', 'Infraestructura'],
  ] as const) {
    await sidebar.getByRole('link', { name: label }).click()

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page.getByText('Contenido en preparación')).toBeVisible()
    await expect(sidebar.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    await expect(headerLink).toHaveAttribute('aria-current', 'page')
  }
})
