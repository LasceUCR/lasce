import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { galleryAlbumList } from '@/app/lib/gallery'
import { publicPaths } from '@/app/lib/site'

// Every album and sub-album, derived so a new one is covered automatically.
const galleryRoutes = galleryAlbumList.flatMap((album) => [
  { label: album.title, path: `/galeria/${album.slug}` },
  ...album.subAlbums.map((subAlbum) => ({
    label: subAlbum.title,
    path: `/galeria/${album.slug}/${subAlbum.slug}`,
  })),
])

const publicRoutes = [
  { label: 'Inicio', path: '/' },
  { label: 'Nosotros', path: '/nosotros' },
  { label: 'Investigación', path: '/investigacion' },
  { label: 'Datos', path: '/datos' },
  { label: 'Noticias', path: '/noticias' },
  { label: 'Publicaciones', path: '/publicaciones' },
  { label: 'Herramientas científicas', path: '/herramientas-cientificas' },
  { label: 'Galería', path: '/galeria' },
  { label: 'Contacto', path: '/contacto' },
] as const

const indexableRoutes = [
  ...publicRoutes,
  { label: 'Física solar', path: '/fisica-solar' },
  { label: 'Clima espacial', path: '/clima-espacial' },
  { label: 'Radioastronomía', path: '/radioastronomia' },
  { label: 'Acceso al portal', path: '/acceso' },
  ...galleryRoutes,
] as const

for (const route of indexableRoutes) {
  test(`${route.path} meets WCAG A and AA automated checks`, async ({ page }) => {
    await page.goto(route.path)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test(`${route.path} is explicitly indexable`, async ({ page }) => {
    const response = await page.goto(route.path)
    const favicon = page.locator('link[rel="icon"]')
    const robots = page.locator('meta[name="robots"]')

    expect(response?.status()).toBe(200)
    await expect(favicon).toHaveAttribute('href', '/brand/ucr-favicon-square.png')
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

// The desktop header keeps three of the routes behind a "Recursos" disclosure, so the
// keyboard sweep opens it on the way. The mobile menu lists every route flat.
const resourcesGroup = {
  label: 'Recursos',
  items: ['Publicaciones', 'Herramientas científicas', 'Galería'],
} as const

const desktopNavigation = [
  'Inicio',
  'Nosotros',
  'Investigación',
  'Datos',
  'Noticias',
  resourcesGroup,
  'Contacto',
] as const

test('all desktop navigation options are reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })
  const group = navigation.locator('details', {
    has: page.locator('summary', { hasText: resourcesGroup.label }),
  })
  for (const entry of desktopNavigation) {
    await page.keyboard.press('Tab')
    if (typeof entry === 'string') {
      await expect(navigation.getByRole('link', { name: entry, exact: true })).toBeFocused()
      // Closed before it is reached, and closed again once focus has left it.
      await expect(group).not.toHaveAttribute('open', '')
      continue
    }

    await expect(group.locator('summary')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(group).toHaveAttribute('open', '')
    for (const label of entry.items) {
      await page.keyboard.press('Tab')
      await expect(navigation.getByRole('link', { name: label, exact: true })).toBeFocused()
    }
  }

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/contacto$/)
})

test('the open Recursos group meets WCAG A and AA automated checks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .locator('summary', { hasText: resourcesGroup.label })
    .click()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
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

// The sweep above only ever sees the gallery closed, and the lightbox is where
// most of the gallery's interaction lives.
test('the gallery lightbox meets WCAG A and AA automated checks while open', async ({ page }) => {
  await page.goto('/galeria/rosac')
  await page
    .getByRole('button', { name: /^Ver a tamaño completo:/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})

// Focus containment is a property of the native top layer, so this is the only
// place it can honestly be verified — jsdom does not implement it.
test('the gallery lightbox can be opened, paged and dismissed with the keyboard', async ({
  page,
}) => {
  await page.goto('/galeria/rosac')

  const tiles = page.getByRole('button', { name: /^Ver a tamaño completo:/ })
  await tiles.first().focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused()
  await expect(dialog.getByText(/^Archivo 1 de \d+$/)).toBeAttached()

  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByText(/^Archivo 2 de \d+$/)).toBeAttached()

  // Tab cannot leave a modal dialog, however many times it is pressed.
  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(dialog.locator(':focus')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  // Focus lands on the file that was open, not the one it was opened from, so
  // paging and then dismissing leaves the visitor where they were looking.
  await expect(tiles.nth(1)).toBeFocused()
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
  for (const path of publicPaths) {
    expect(sitemap).toContain(`<loc>http://localhost:3000${path}</loc>`)
  }
  expect(sitemap).not.toContain('/api/')
})
