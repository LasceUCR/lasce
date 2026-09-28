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
      name: /^ROSAC/,
    })
    await expect(rosacLink).toHaveAttribute('href', '/radioastronomia')
    await rosacLink.click()

    await expect(page).toHaveURL(/\/radioastronomia$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Radioastronomía' })).toBeVisible()
    await expect(
      page.getByRole('img', { name: 'Logo del Radio Observatorio de Santa Cruz (ROSAC)' }),
    ).toBeVisible()
    // The map loads on the client only, after the initial page content, so give it a
    // moment before checking that its own footprint does not cause horizontal overflow.
    await expect(page.getByRole('region', { name: /^Mapa de ubicación de/ })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)

    await page.getByRole('link', { name: 'Volver a las áreas' }).click()
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
  await expect(
    page.getByRole('img', { name: 'Logo del Radio Observatorio de Santa Cruz (ROSAC)' }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: '¿Qué es ROSAC?' })).toContainText(
    'observar el Sol y otras fuentes celestes',
  )
  await expect(page.getByRole('heading', { name: 'Antena de 11 metros' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Entre 100 y 1000 MHz' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Santa Cruz, Guanacaste' })).toBeVisible()
  const location = page.getByRole('region', { name: '2. Ubicación' })
  await expect(location).toContainText('Recinto de Santa Cruz')
  await expect(location.getByRole('region', { name: /^Mapa de ubicación de/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'ROSAC y LASCE' })).toContainText(
    'LASCE convierte observaciones en conocimiento',
  )
  await expect(page.getByRole('region', { name: /Investigadores/ })).toContainText(
    'Dra. Carolina Salas Matamoros',
  )
  await expect(page).toHaveTitle('Radioastronomía y ROSAC | LASCE')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/radioastronomia$/)
})

test('presents each ROSAC researcher card with public information', async ({ page }) => {
  await page.goto('/radioastronomia')

  const team = page.getByRole('region', { name: /Investigadores/ })
  await expect(team).toContainText('Haga clic en una ficha para ver más información.')
  const track = team.getByRole('list', { name: 'Investigadores' })

  await expect(track.getByRole('listitem')).toHaveCount(14)
  await expect(team.getByRole('heading', { name: 'Dra. Carolina Salas Matamoros' })).toBeVisible()
  await expect(team.getByText('Investigadora principal', { exact: true })).toBeVisible()
  await expect(team.getByRole('link', { name: 'carolina.salas_mata@ucr.ac.cr' })).toHaveAttribute(
    'href',
    'mailto:carolina.salas_mata@ucr.ac.cr',
  )
  await expect(
    team.getByText('Institución: Centro de Investigaciones Espaciales (CINESPA), UC...').first(),
  ).toBeVisible()
  const carolina = track.getByRole('listitem').filter({ hasText: 'Dra. Carolina Salas Matamoros' })
  await carolina
    .getByRole('button', { name: 'Ver descripción de Dra. Carolina Salas Matamoros' })
    .click()
  await expect(
    carolina.getByText('Institución: Centro de Investigaciones Espaciales (CINESPA), UCR', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    team.getByText(
      'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
    ),
  ).toBeVisible()

  await expect(track).toHaveAttribute('tabindex', '0')
  for (const image of await team.locator('img').all()) {
    await expect(image).toHaveAttribute('alt', '')
  }
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

test('keeps ROSAC access out of the shared navigation and scientific tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').getByRole('link', { name: /ROSAC/ })).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: /ROSAC/ })).toHaveCount(0)

  await page.goto('/herramientas-cientificas')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Herramientas científicas' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /ROSAC/ })).toHaveCount(0)
})

test('the skip link focuses ROSAC content', async ({ page }) => {
  await page.goto('/radioastronomia')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

test('loads the location map with real satellite tiles and a marker identified as ROSAC', async ({
  page,
}) => {
  await page.goto('/radioastronomia')

  const location = page.getByRole('region', { name: '2. Ubicación' })
  const map = location.getByRole('region', { name: /^Mapa de ubicación de/ })
  await expect(map).toBeVisible()
  await expect(map.getByText('ROSAC')).toBeVisible()
  await expect(map.locator('img.leaflet-tile-loaded').first()).toBeVisible()
  await expect(location.getByRole('status')).toHaveCount(0)
})

test('falls back to a text message if the map tiles cannot be loaded, keeping the rest of the page usable', async ({
  page,
}) => {
  await page.route('**/*.arcgisonline.com/**', (route) => route.abort())
  await page.goto('/radioastronomia')

  const location = page.getByRole('region', { name: '2. Ubicación' })
  await expect(location.getByRole('status')).toContainText('No fue posible cargar el mapa')
  // The address is rendered outside the map component, so it survives the failure.
  await expect(location).toContainText('Recinto de Santa Cruz')
  await expect(location.getByRole('region', { name: /^Mapa de ubicación de/ })).toHaveCount(0)

  // The rest of the page is unaffected by the map failing.
  await expect(page.getByRole('heading', { level: 1, name: 'Radioastronomía' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'ROSAC y LASCE' })).toBeVisible()
})
