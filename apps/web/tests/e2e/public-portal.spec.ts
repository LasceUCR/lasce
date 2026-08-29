import { expect, test } from '@playwright/test'

const publicRoutes = [
  { label: 'Inicio', path: '/', heading: 'Exploramos el Sol para comprender el clima espacial' },
  { label: 'Nosotros', path: '/nosotros', heading: 'Nosotros' },
  { label: 'Investigación', path: '/investigacion', heading: 'Investigación' },
  { label: 'Instrumentación', path: '/instrumentacion', heading: 'Instrumentación' },
  { label: 'Datos', path: '/datos', heading: 'Datos' },
  { label: 'Noticias', path: '/noticias', heading: 'Noticias' },
  { label: 'Contacto', path: '/contacto', heading: 'Contacto' },
] as const

const areaCards = [
  { name: 'Física solar', path: '/investigacion' },
  { name: 'Clima espacial', path: '/datos' },
  { name: 'Radioastronomía', path: '/investigacion' },
  { name: 'Instrumentación', path: '/instrumentacion' },
  { name: 'Datos y análisis', path: '/datos' },
  { name: 'Divulgación', path: '/noticias' },
] as const

test('loads the public landing page without authentication', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Exploramos el Sol para comprender el clima espacial',
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
  expect(new URL(page.url()).pathname).toBe('/')
})

for (const route of publicRoutes) {
  test(`opens ${route.path} directly without a login redirect`, async ({ page }) => {
    const response = await page.goto(route.path)

    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(route.path)
    expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
  })
}

test('navigates through every public option and exposes the active page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })

  for (const route of publicRoutes) {
    const link = navigation.getByRole('link', { name: route.label, exact: true })

    await link.click()
    await expect(page).toHaveURL(new RegExp(`${route.path === '/' ? '/$' : `${route.path}$`}`))
    await expect(link).toHaveAttribute('aria-current', 'page')
  }
})

for (const card of areaCards) {
  test(`opens the public route from the ${card.name} card`, async ({ page }) => {
    await page.goto('/')

    const link = page.locator('.area-card').filter({ hasText: card.name })
    await expect(link).toHaveAttribute('href', card.path)
    await link.click()

    await expect(page).toHaveURL(new RegExp(`${card.path}$`))
  })
}

test('navigates with the mobile menu and closes it afterwards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const menu = page.locator('.mobile-menu')
  await menu.locator('summary').click()
  await expect(menu).toHaveAttribute('open', '')

  const navigation = page.getByRole('navigation', { name: 'Navegación móvil' })
  const newsLink = navigation.getByRole('link', { name: 'Noticias', exact: true })
  await newsLink.click()

  await expect(page).toHaveURL(/\/noticias$/)
  await expect(menu).not.toHaveAttribute('open', '')

  await menu.locator('summary').click()
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación móvil' })
      .getByRole('link', { name: 'Noticias', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('returns 404 for an unknown public route', async ({ page }) => {
  const response = await page.goto('/ruta-publica-inexistente')

  expect(response?.status()).toBe(404)
})
