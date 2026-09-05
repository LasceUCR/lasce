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
  { name: 'Física solar', path: '/fisica-solar' },
  { name: 'Clima espacial', path: '/clima-espacial' },
  { name: 'Radioastronomía', path: '/radioastronomia' },
  { name: 'Instrumentación', path: '/instrumentacion' },
  { name: 'Datos y análisis', path: '/datos' },
  { name: 'Divulgación', path: '/noticias' },
] as const

const workAreaRoutes = [
  { path: '/fisica-solar', heading: 'Física solar' },
  { path: '/clima-espacial', heading: 'Clima espacial' },
  { path: '/radioastronomia', heading: 'Radioastronomía' },
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

for (const route of workAreaRoutes) {
  test(`opens ${route.path} directly without a login redirect`, async ({ page }) => {
    const response = await page.goto(route.path)

    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(route.path)
    expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
  })
}

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

test('displays space weather information without authentication', async ({ page }) => {
  const response = await page.goto('/clima-espacial')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/clima-espacial')
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Clima espacial' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Qué es el clima espacial/ })).toBeVisible()
  await expect(page.getByText(/No es el clima atmosférico cotidiano/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Del Sol a la Tierra/ })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Por qué estudiarlo desde Costa Rica/ }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /Qué compone el clima espacial/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actividad solar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Viento solar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'El Sol y el clima espacial' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'El trabajo de LASCE' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Indicadores actuales' })).toHaveCount(0)
  await expect(page.getByText('Datos simulados')).toHaveCount(0)
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /clima espacial/i,
  )
})

test('displays solar astrophysics information without authentication', async ({ page }) => {
  const response = await page.goto('/fisica-solar')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/fisica-solar')
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Física solar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Qué estudia la física solar/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actividad solar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'El trabajo de LASCE en física solar' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Fulguración solar/ })).toBeVisible()
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /física solar/i)
})

test('returns to the work areas section from space weather', async ({ page }) => {
  await page.goto('/clima-espacial')

  await page.getByRole('link', { name: 'Volver a las áreas de trabajo' }).click()

  await expect(page).toHaveURL(/\/#areas-de-trabajo/)
  await expect(page.getByRole('heading', { name: 'Áreas y accesos principales' })).toBeVisible()
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)
})

test('returns to the work areas section from solar astrophysics', async ({ page }) => {
  await page.goto('/fisica-solar')

  await page.getByRole('link', { name: 'Volver a las áreas de trabajo' }).click()

  await expect(page).toHaveURL(/\/#areas-de-trabajo/)
  await expect(page.getByRole('heading', { name: 'Áreas y accesos principales' })).toBeVisible()
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)
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
