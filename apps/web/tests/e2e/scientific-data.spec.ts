import { expect, test, type Page } from '@playwright/test'

async function mockObservedXrays(page: Page, points = true) {
  await page.route('**/api/scientific-data?**', async (route) => {
    const parameters = new URL(route.request().url()).searchParams
    const date = parameters.get('date')!
    const query = {
      source: 'GOES',
      product: 'SFXR',
      parameter: '0.1-0.8nm',
      date,
      startTime: parameters.get('startTime')!,
      endTime: parameters.get('endTime')!,
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        query,
        instrument: { code: 'EXIS', name: 'Sensores de irradiancia' },
        product: { code: 'SFXR', name: 'Flujo solar: rayos X' },
        parameter: { code: '0.1-0.8nm', label: 'Banda larga (0,1–0,8 nm)', unit: 'W/m²' },
        origin: {
          kind: 'observed',
          provider: 'NOAA Space Weather Prediction Center',
          notice: 'Datos observados del servicio público GOES primario de NOAA.',
          satellite: 18,
        },
        visualization: 'time-series',
        points: points
          ? [
              { timestamp: `${date}T08:00:00Z`, value: 0.0000064 },
              { timestamp: `${date}T08:30:00Z`, value: 0.0000078 },
            ]
          : [],
      }),
    })
  })
}

test('keeps query controls disabled until the client can preserve input', async ({ page }) => {
  let releaseScripts!: () => void
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  await page.route(/\/_next\/.*\.js(?:\?.*)?$/, async (route) => {
    await scriptsReady
    await route.continue()
  })
  await mockObservedXrays(page)

  const controls = [
    page.getByRole('combobox', { name: 'Fuente de datos' }),
    page.getByRole('combobox', { name: 'Producto científico' }),
    page.getByRole('combobox', { name: 'Canal o parámetro' }),
    page.getByLabel('Fecha', { exact: true }),
    page.getByLabel('Hora de inicio'),
    page.getByLabel('Hora de fin'),
    page.getByRole('button', { name: 'Consultar datos' }),
  ]

  try {
    await page.goto('/datos', { waitUntil: 'commit' })
    for (const control of controls) await expect(control).toBeDisabled()
  } finally {
    releaseScripts()
  }

  for (const control of controls) await expect(control).toBeEnabled()
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('09:00')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  const results = page.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
  await expect(results.getByText('08:00–09:00 UTC')).toBeVisible()
})

test('queries and visualizes observed GOES data publicly', async ({ page }) => {
  await mockObservedXrays(page)
  const response = await page.goto('/datos')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/datos')
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toHaveValue('GOES')
  await expect(page.getByRole('combobox', { name: 'Producto científico' })).toHaveValue('SFXR')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('09:00')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  const results = page.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
  await expect(results).toBeVisible()
  await expect(results.getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeVisible()
  await expect(results.getByText('08:00–09:00 UTC')).toBeVisible()
  await expect(results.getByText(/Datos observados del servicio público/)).toBeVisible()
  await expect(results.getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /descargar/i })).toHaveCount(0)
})

test('exposes ROSAC as a clearly simulated dynamic-spectrum source', async ({ page }) => {
  await page.goto('/datos')
  await page.getByRole('combobox', { name: 'Fuente de datos' }).selectOption('ROSAC')
  await page.getByRole('combobox', { name: 'Producto científico' }).selectOption('ROSAC-I2')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('08:20')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(page.getByText('Simulación')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Espectro dinámico simulado de ROSAC' })).toBeVisible()
  await expect(page.getByText(/Datos simulados para preparar la integración/)).toBeVisible()
})

test('rejects an invalid time range without calling the public endpoint', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/scientific-data') requests += 1
  })

  await page.goto('/datos')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('08:00')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'La hora de inicio debe ser anterior a la hora de fin.' }),
  ).toBeVisible()
  expect(requests).toBe(0)
})

test('shows the no-data state and leaves the query editable', async ({ page }) => {
  await mockObservedXrays(page, false)
  await page.goto('/datos')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(page.getByRole('status')).toContainText('No hay datos disponibles')
  await expect(page.getByRole('combobox', { name: 'Producto científico' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
})

test('keeps the scientific query usable without horizontal overflow on mobile', async ({
  page,
}) => {
  await mockObservedXrays(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/datos')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(page.getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
