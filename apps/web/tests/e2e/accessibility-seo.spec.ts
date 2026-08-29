import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const publicRoutes = [
  { label: 'Inicio', path: '/' },
  { label: 'Nosotros', path: '/nosotros' },
  { label: 'Investigación', path: '/investigacion' },
  { label: 'Instrumentación', path: '/instrumentacion' },
  { label: 'Datos', path: '/datos' },
  { label: 'Noticias', path: '/noticias' },
  { label: 'Contacto', path: '/contacto' },
] as const

for (const route of publicRoutes) {
  test(`${route.path} meets WCAG A and AA automated checks`, async ({ page }) => {
    await page.goto(route.path)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test(`${route.path} is explicitly indexable`, async ({ page }) => {
    const response = await page.goto(route.path)
    const robots = page.locator('meta[name="robots"]')

    expect(response?.status()).toBe(200)
    await expect(robots).toHaveAttribute('content', /index/i)
    await expect(robots).not.toHaveAttribute('content', /noindex/i)
  })
}

test('skip link moves keyboard focus to the shared main content', async ({ page }) => {
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' })
  const mainContent = page.getByRole('main')

  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(mainContent).toBeFocused()
})

test('all desktop navigation options are reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })
  for (const route of publicRoutes) {
    await page.keyboard.press('Tab')
    await expect(navigation.getByRole('link', { name: route.label, exact: true })).toBeFocused()
  }

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/contacto$/)
})

test('mobile navigation can be opened and used with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const menu = page.locator('.mobile-menu')
  const summary = menu.locator('summary')
  await expect(summary).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('open', '')

  const navigation = page.getByRole('navigation', { name: 'Navegación móvil' })
  for (const route of publicRoutes) {
    await page.keyboard.press('Tab')
    await expect(navigation.getByRole('link', { name: route.label, exact: true })).toBeFocused()
  }

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/contacto$/)
  await expect(menu).not.toHaveAttribute('open', '')
})

test('robots and sitemap expose only indexable public routes', async ({ request }) => {
  const robotsResponse = await request.get('/robots.txt')
  const robots = await robotsResponse.text()

  expect(robotsResponse.status()).toBe(200)
  expect(robots).toContain('User-Agent: *')
  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Disallow: /api/')
  expect(robots).toContain('Sitemap: http://localhost:3000/sitemap.xml')

  const sitemapResponse = await request.get('/sitemap.xml')
  const sitemap = await sitemapResponse.text()

  expect(sitemapResponse.status()).toBe(200)
  for (const route of publicRoutes) {
    expect(sitemap).toContain(`<loc>http://localhost:3000${route.path}</loc>`)
  }
  expect(sitemap).not.toContain('/api/')
})
