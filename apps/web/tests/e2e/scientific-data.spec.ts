import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('touch controls', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('selects an option by touch without closing the menu prematurely', async ({ page }) => {
    await page.goto('/datos')
    await page.getByRole('combobox', { name: 'Fuente de datos' }).tap()
    await page.getByRole('option', { name: /ROSAC/ }).tap()
    await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toContainText('ROSAC')
    await page.getByRole('combobox', { name: 'Producto científico' }).tap()
    await page.getByRole('option', { name: /Espectro dinámico/ }).tap()
    await expect(page.getByRole('combobox', { name: 'Producto científico' })).toContainText(
      'ROSAC-I2',
    )
    await expect(page.getByRole('listbox')).toHaveCount(0)
  })
})

for (const width of [320, 768, 1440]) {
  test(`keeps dropdowns contained and scrollable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 })
    await page.goto('/datos')
    const product = page.getByRole('combobox', { name: 'Producto científico' })
    await product.click()
    let menu = page.getByRole('listbox', { name: 'Producto científico' })
    await expect(menu).toBeVisible()
    expect(await menu.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await expect(page.getByRole('option', { name: /Iones pesados/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await page.getByRole('option', { name: /media y alta/ }).click()

    const parameter = page.getByRole('combobox', { name: 'Canal o parámetro' })
    await parameter.scrollIntoViewIfNeeded()
    await parameter.hover()
    expect(await parameter.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'none',
    )
    await parameter.click()
    menu = page.getByRole('listbox', { name: 'Canal o parámetro' })
    await expect(menu).toBeVisible()
    const box = (await menu.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(720)
    expect(
      await menu.evaluate((element) => ({
        scrolls: element.scrollHeight > element.clientHeight,
        contained: element.scrollWidth <= element.clientWidth,
        overflow: getComputedStyle(element).overflowY,
      })),
    ).toEqual({ scrolls: true, contained: true, overflow: 'auto' })
    await parameter.press('End')
    const last = page.getByRole('option', { name: 'Protones: telescopio 5, banda 11' })
    await expect(last).toBeInViewport()
    expect(await menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await page.screenshot({
      path: testInfo.outputPath(`dropdown-${width}.png`),
      animations: 'disabled',
    })
    if (width === 320) {
      const accessibility = await new AxeBuilder({ page }).include('[role="listbox"]').analyze()
      expect(accessibility.violations).toEqual([])
    }
    await parameter.press('Enter')
    await expect(parameter).toHaveText('Protones: telescopio 5, banda 11')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('limits solar dates and UTC times while retaining historical series dates', async ({
  page,
}) => {
  await page.goto('/datos')
  const date = page.getByLabel('Fecha', { exact: true })
  await expect(date).not.toHaveAttribute('min')
  await date.fill('2025-01-05')
  const product = page.getByRole('combobox', { name: 'Producto científico' })
  await product.click()
  await page.getByRole('option', { name: /171 Å/ }).click()
  const today = (await date.getAttribute('max'))!
  const yesterday = new Date(`${today}T00:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  await expect(date).toHaveAttribute('min', yesterday.toISOString().slice(0, 10))
  await expect(page.getByText(/Últimas 24 horas \(UTC\):/)).toBeVisible()
  await date.fill(yesterday.toISOString().slice(0, 10))
  const minimum = (await page.getByLabel('Hora de inicio').getAttribute('min'))!
  expect(minimum).toMatch(/^\d{2}:\d{2}$/)
  await expect(page.getByLabel('Hora de fin')).toHaveAttribute('max', '23:59')
  if (minimum > '00:00') {
    await page.getByLabel('Hora de inicio').fill('00:00')
    await page.getByRole('button', { name: 'Consultar datos' }).click()
    await expect(page.getByRole('alert').filter({ hasText: /últimas 24 horas/ })).toBeVisible()
  }
  await product.click()
  await page.getByRole('option', { name: /Flujo solar: rayos X/ }).click()
  await expect(date).not.toHaveAttribute('min')
  await date.fill('2025-01-05')
  await expect(date).toHaveValue('2025-01-05')
})

async function mockObservedXrays(page: Page, points = true, pending = false) {
  await page.route('**/api/scientific-data?**', async (route) => {
    const parameters = new URL(route.request().url()).searchParams
    if (pending && !parameters.has('jobId')) {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ state: 'pending', jobId: 'goes-test', progress: 25 }),
      })
      return
    }
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
          provider: 'CITIC-UCR — archivo histórico GOES de NOAA',
          notice: 'Observaciones históricas del archivo GOES nivel 1b de CITIC-UCR.',
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

test('queries and visualizes historical GOES data publicly', async ({ page }) => {
  await mockObservedXrays(page, true, true)
  const response = await page.goto('/datos')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/datos')
  expect(page.url()).not.toMatch(/\/(login|auth)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toHaveText(
    'GOES — CITIC / NOAA',
  )
  await expect(page.getByRole('combobox', { name: 'Producto científico' })).toHaveText(
    'Flujo solar: rayos X (SFXR)',
  )
  await page.getByLabel('Fecha', { exact: true }).fill('2025-01-05')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('09:00')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  const results = page.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
  await expect(page.getByRole('status')).toContainText('Cargando datos')
  await expect(results).toBeVisible()
  await expect(results.getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeVisible()
  await expect(results.getByText('08:00–09:00 UTC')).toBeVisible()
  await expect(results.getByText(/Observaciones históricas/)).toBeVisible()
  await expect(results.getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /descargar/i })).toHaveCount(0)
})

test('exposes ROSAC as a clearly simulated dynamic-spectrum source', async ({ page }) => {
  await page.goto('/datos')
  await page.getByRole('combobox', { name: 'Fuente de datos' }).click()
  await page.getByRole('option', { name: /ROSAC/ }).click()
  await page.getByRole('combobox', { name: 'Producto científico' }).click()
  await page.getByRole('option', { name: /Espectro dinámico/ }).click()
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
