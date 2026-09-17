import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const

test('opens the general information page directly without a login redirect', async ({ page }) => {
  const response = await page.goto('/nosotros')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/nosotros')
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
})

test('explains what LASCE is and what its purpose is', async ({ page }) => {
  await page.goto('/nosotros')

  await expect(page.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeVisible()
  await expect(page.getByRole('region', { name: '¿Quiénes somos?' })).toContainText(
    /iniciativa científica vinculada al Centro de Investigaciones Espaciales/,
  )
  await expect(page.getByRole('region', { name: /Qué hacemos/ })).toContainText(
    /Analizamos fenómenos solares eruptivos/,
  )
  await expect(page.getByRole('region', { name: 'Aporte distintivo' })).toContainText(
    /no sea únicamente usuaria de información internacional/,
  )
  await expect(page.getByRole('region', { name: 'Nuestra visión' })).toContainText(
    /referente regional para la observación del Sol/,
  )

  const researchers = page.getByRole('region', { name: /Investigadores LASCE/ })
  const track = researchers.getByRole('list', { name: 'Investigadores LASCE' })

  await expect(track.getByRole('listitem')).toHaveCount(8)
  await expect(track).toHaveAttribute('tabindex', '0')
  await expect(researchers.getByRole('button', { name: 'Anterior' })).toBeVisible()
  await expect(researchers.getByRole('button', { name: 'Siguiente' })).toBeVisible()
  await expect(
    researchers.getByRole('heading', { name: 'Dra. Carolina Salas Matamoros' }),
  ).toBeVisible()
  await expect(
    researchers.getByRole('heading', { name: 'Dr. Allan Francisco Berrocal Rojas' }),
  ).toBeVisible()
  await expect(
    researchers.getByRole('heading', { name: 'Dr. Luis Gustavo Esquivel Quirós' }),
  ).toBeVisible()
  await expect(researchers.getByRole('heading', { name: 'MSc. Ivania Calvo' })).toBeVisible()
  await expect(researchers.getByRole('heading', { name: 'Dr. Felipe Meza' })).toBeVisible()
  await expect(researchers.getByRole('heading', { name: 'MSc. Alonso Vega' })).toBeVisible()
  await expect(researchers.getByRole('heading', { name: 'Dra. Gabriela Molina' })).toBeVisible()
  await expect(researchers.getByRole('heading', { name: 'Dra. Yenca Migoya' })).toBeVisible()
  await expect(
    researchers.getByRole('link', { name: 'carolina.salas_mata@ucr.ac.cr' }),
  ).toHaveAttribute('href', 'mailto:carolina.salas_mata@ucr.ac.cr')
  await expect(researchers.getByRole('link', { name: 'allan.berrocal@ucr.ac.cr' })).toHaveAttribute(
    'href',
    'mailto:allan.berrocal@ucr.ac.cr',
  )
  await expect(researchers.getByRole('link', { name: 'ivannia.calvo@ucr.ac.cr' })).toHaveAttribute(
    'href',
    'mailto:ivannia.calvo@ucr.ac.cr',
  )
  await expect(researchers.getByText('Investigadora principal')).toBeVisible()
  await expect(
    researchers.getByText('Institución: Centro de Investigaciones Espaciales, CINESPA'),
  ).toBeVisible()
  await researchers
    .getByRole('button', { name: 'Ver descripción de Dra. Carolina Salas Matamoros' })
    .click()
  await expect(
    researchers.getByText(
      /coordina la integración entre astrofísica solar, radioastronomía, clima espacial/,
    ),
  ).toBeVisible()
  await expect(researchers.getByText('Investigador colaborador').first()).toBeVisible()
  await researchers.getByRole('button', { name: 'Ver descripción de MSc. Ivania Calvo' }).click()
  await expect(
    researchers.getByText(
      'Soporte Técnico/Computacional y encargada del Observatorio Astronómico de San José (OAS)',
    ),
  ).toBeVisible()
  for (const image of await researchers.locator('img').all()) {
    await expect(image).toHaveAttribute('alt', '')
  }

  // The copy is approved, so the provisional banner must not be on the page.
  await expect(page.getByRole('complementary', { name: 'Información provisional' })).toHaveCount(0)

  // The catch-all placeholder must no longer serve this route.
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByText('Dr. Miguel Velázquez')).toHaveCount(0)
})

test('exposes indexable metadata for the general information page', async ({ page }) => {
  await page.goto('/nosotros')

  await expect(page).toHaveTitle('Quiénes somos | LASCE')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /Laboratorio de Astrofísica Solar y Clima Espacial/i,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/nosotros$/)
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/i)
})

test('reaches the section from the navigation and marks it as current', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })
  const link = navigation.getByRole('link', { name: 'Nosotros', exact: true })

  await link.click()

  await expect(page).toHaveURL(/\/nosotros$/)
  await expect(link).toHaveAttribute('aria-current', 'page')
})

test('reaches the section from the landing page call to action', async ({ page }) => {
  await page.goto('/')

  const cta = page.getByRole('link', { name: 'Conoce más sobre LASCE' })
  await expect(cta).toHaveAttribute('href', '/nosotros')
  await cta.click()

  await expect(page).toHaveURL(/\/nosotros$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeVisible()
})

test('returns to the public landing page and stays unauthenticated', async ({ page }) => {
  await page.goto('/nosotros')

  await page.getByRole('link', { name: 'Volver al inicio' }).click()

  await expect(page).toHaveURL(new RegExp(`${'/'}$`))
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Exploramos el Sol para comprender el clima espacial',
    }),
  ).toBeVisible()
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
})

test('moves keyboard focus to the main content through the skip link', async ({ page }) => {
  await page.goto('/nosotros')

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

for (const viewport of viewports) {
  test(`fits the ${viewport.name} viewport without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/nosotros')

    await expect(page.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeVisible()

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )
    expect(fits).toBe(true)
  })
}
