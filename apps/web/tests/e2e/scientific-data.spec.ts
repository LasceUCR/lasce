import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { findScientificProduct, type ScientificProductCode } from '../../app/lib/scientific-data'
import { createSignedInUser } from './helpers/admin-users'

const SUVI_FRAME_PREFIX = '/api/suvi/frames/5f0c2a52-8a51-4c7e-9d5b-'

/** A stable, uuid-shaped frame path per SUVI product and image position. */
function suviFrameUrl(product: string, index: number) {
  const channel = ['Fe093', 'Fe131', 'Fe171', 'Fe195', 'Fe284', 'He303'].indexOf(product)
  return `${SUVI_FRAME_PREFIX}${channel.toString(16).padStart(2, '0')}${index.toString(16).padStart(10, '0')}`
}

test.beforeEach(async ({ page }) => {
  await page.route('**/_next/image?**', async (route) => {
    if (!new URL(route.request().url()).searchParams.get('url')?.startsWith(SUVI_FRAME_PREFIX)) {
      return route.fallback()
    }
    await route.fulfill({
      path: './public/images/decorative/Solar-Flare.png',
      contentType: 'image/png',
    })
  })
  await page.route('**/api/scientific-data?**', async (route) => {
    const parameters = new URL(route.request().url()).searchParams
    const selection = findScientificProduct(
      'GOES',
      parameters.get('product') as ScientificProductCode,
    )
    if (parameters.get('source') !== 'GOES' || selection?.instrument.code !== 'SUVI') {
      return route.fallback()
    }
    const date = parameters.get('date')!
    const start = Date.parse(`${date}T${parameters.get('startTime')}:00Z`)
    const end = Date.parse(`${date}T${parameters.get('endTime')}:00Z`)
    await route.fulfill({
      json: {
        query: Object.fromEntries(parameters),
        instrument: { code: selection.instrument.code, name: selection.instrument.name },
        product: { code: selection.product.code, name: selection.product.name },
        parameter: selection.product.parameters[0],
        origin: {
          kind: 'observed',
          provider: 'GOES',
          notice: 'Fuente: GOES. Imágenes observadas de SUVI.',
        },
        visualization: 'image-sequence',
        images:
          parameters.get('product') === 'Fe131'
            ? []
            : Array.from({ length: 8 }, (_, index) => ({
                timestamp: new Date(start + ((end - start) * index) / 7).toISOString(),
                imageUrl: suviFrameUrl(selection.product.code, index),
                alt: `Imagen solar de GOES: ${selection.product.wavelength}`,
              })),
      },
    })
  })
})

async function selectHistoricalXrays(page: Page) {
  await page.getByRole('combobox', { name: 'Instrumento y producto' }).click()
  await page.getByRole('treeitem', { name: /^EXIS/ }).click()
  await page.getByRole('treeitem', { name: /Flujo solar: rayos X/ }).click()
  await page.getByRole('combobox', { name: 'Canal o parámetro' }).click()
  await page.getByRole('option', { name: /Banda larga/ }).click()
}

test.describe('touch controls', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('selects an option by touch without closing the menu prematurely', async ({ page }) => {
    await page.goto('/datos')
    await page.getByRole('combobox', { name: 'Fuente de datos' }).tap()
    await page.getByRole('option', { name: /ROSAC/ }).tap()
    await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toContainText('ROSAC')
    await page.getByRole('combobox', { name: 'Instrumento y producto' }).tap()
    await page.getByRole('treeitem', { name: /^ROSAC-I2/ }).tap()
    await page.getByRole('treeitem', { name: /Espectro dinámico/ }).tap()
    await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText(
      'ROSAC-I2',
    )
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(page.getByRole('tree')).toHaveCount(0)
  })
})

for (const width of [320, 768, 1440]) {
  test(`keeps dropdowns contained and scrollable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 })
    await page.goto('/datos')
    const product = page.getByRole('combobox', { name: 'Instrumento y producto' })
    await product.click()
    const instruments = page.getByRole('tree', { name: 'Instrumento y producto' })
    await expect(instruments.getByRole('treeitem')).toHaveCount(4)
    const exis = page.getByRole('treeitem', { name: /^EXIS/ })
    await expect(exis).toContainText('Sensores de irradiancia ultravioleta extrema y rayos X')
    const instrumentBox = (await instruments.boundingBox())!
    expect(instrumentBox.x).toBeGreaterThanOrEqual(0)
    expect(instrumentBox.x + instrumentBox.width).toBeLessThanOrEqual(width)
    expect(await exis.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await product.press('ArrowDown')
    const mag = page.getByRole('treeitem', { name: /^MAG/ })
    await expect(product).toHaveAttribute('aria-activedescendant', (await mag.getAttribute('id'))!)
    await product.press('Enter')
    await expect(mag).toHaveAttribute('aria-expanded', 'true')
    await expect(product).toContainText('Flujo solar: rayos X (SFXR)')
    await product.press('ArrowDown')
    await product.press('Enter')
    await expect(product).toContainText('Magnetómetro')
    await product.click()
    await expect(instruments.getByRole('treeitem')).toHaveCount(4)
    await page.getByRole('treeitem', { name: /^SEISS/ }).click()
    expect(await product.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    )
    await expect(instruments).toBeVisible()
    await expect(page.getByRole('treeitem', { name: /Iones pesados/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(page.getByRole('treeitem', { name: /Iones pesados/ })).toBeInViewport()
    await page.screenshot({
      path: testInfo.outputPath(`instruments-${width}.png`),
      animations: 'disabled',
    })
    if (width === 320) {
      const accessibility = await new AxeBuilder({ page }).include('[role="tree"]').analyze()
      expect(accessibility.violations).toEqual([])
    }
    await page.getByRole('treeitem', { name: /media y alta/ }).click()
    await expect(product).toContainText('Suite ambiental espacial in situ')

    const parameter = page.getByRole('combobox', { name: 'Canal o parámetro' })
    await parameter.scrollIntoViewIfNeeded()
    await parameter.hover()
    expect(await parameter.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'none',
    )
    await parameter.click()
    const menu = page.getByRole('listbox', { name: 'Canal o parámetro' })
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

test('limits GOES dates to today and lets SUVI use historical dates', async ({ page }) => {
  await page.goto('/datos')
  await selectHistoricalXrays(page)
  const date = page.getByLabel('Fecha', { exact: true })
  await expect(date).not.toHaveAttribute('min')
  await date.fill('2025-01-05')
  const product = page.getByRole('combobox', { name: 'Instrumento y producto' })
  await product.click()
  await page.getByRole('treeitem', { name: /^SUVI/ }).click()
  await page.getByRole('treeitem', { name: /171 Å/ }).click()
  await expect(date).not.toHaveAttribute('min')
  await expect(date).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/)
  await expect(date).toHaveValue('2025-01-05')
  await expect(page.getByLabel('Hora de inicio')).not.toHaveAttribute('min')
  await expect(page.getByLabel('Hora de fin')).not.toHaveAttribute('max')
})

async function mockObservedXrays(page: Page, points = true, pending = false) {
  await page.route('**/api/scientific-data?**', async (route) => {
    const parameters = new URL(route.request().url()).searchParams
    if (parameters.get('product') !== 'SFXR') return route.fallback()
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
          provider: 'GOES',
          notice: 'Fuente: GOES. Observaciones históricas de nivel 1b.',
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
    page.getByRole('combobox', { name: 'Instrumento y producto' }),
    page.getByRole('radio', { name: '195 Å' }),
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
  await selectHistoricalXrays(page)
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
  await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toHaveText('GOES')
  await selectHistoricalXrays(page)
  await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText(
    'Flujo solar: rayos X (SFXR)',
  )
  await page.getByLabel('Fecha', { exact: true }).fill('2025-01-05')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('09:00')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  const results = page.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
  await expect(page.getByRole('status').filter({ hasText: 'Cargando datos' })).toBeVisible()
  await expect(results).toBeVisible()
  await expect(results.getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeVisible()
  await expect(results.getByText('08:00–09:00 UTC')).toBeVisible()
  await expect(results.getByText(/Observaciones históricas/)).toBeVisible()
  await expect(results.getByRole('link')).toHaveCount(0)
  await expect(results.getByRole('button', { name: /CSV/ })).toHaveCount(0)
  await results.getByRole('button', { name: 'Inicie sesión para descargar la gráfica' }).click()
  await expect(page).toHaveURL(/\/acceso\?next=%2Fdatos&reason=auth$/)
})

test.describe('downloads', () => {
  async function queryRosacSpectrum(page: Page) {
    await page.goto('/datos')
    await page.getByRole('combobox', { name: 'Fuente de datos' }).click()
    await page.getByRole('option', { name: /ROSAC/ }).click()
    await page.getByRole('combobox', { name: 'Instrumento y producto' }).click()
    await page.getByRole('treeitem', { name: /^ROSAC-I2/ }).click()
    await page.getByRole('treeitem', { name: /Espectro dinámico/ }).click()
    await page.getByLabel('Hora de inicio').fill('08:00')
    await page.getByLabel('Hora de fin').fill('08:20')
    await page.getByRole('button', { name: 'Consultar datos' }).click()
    return page.getByRole('region', { name: /Espectro dinámico de prueba/ })
  }

  /** Serves a fixed SFXR series, so these tests do not depend on what InfluxDB has ingested. */
  async function queryHistoricalXrays(page: Page) {
    const selection = findScientificProduct('GOES', 'SFXR')!
    await page.route('**/api/scientific-data?**', async (route) => {
      const parameters = new URL(route.request().url()).searchParams
      if (parameters.get('product') !== 'SFXR') return route.fallback()
      await route.fulfill({
        json: {
          query: Object.fromEntries(parameters),
          instrument: { code: selection.instrument.code, name: selection.instrument.name },
          product: { code: selection.product.code, name: selection.product.name },
          parameter: selection.product.parameters.find(
            (parameter) => parameter.code === parameters.get('parameter'),
          ),
          origin: { kind: 'observed', provider: 'GOES', notice: 'Fuente: GOES.', satellite: 19 },
          visualization: 'time-series',
          points: [
            { timestamp: '2025-01-05T08:00:00Z', value: 1e-7 },
            { timestamp: '2025-01-05T08:30:00Z', value: 3e-7 },
            { timestamp: '2025-01-05T09:00:00Z', value: 2e-7 },
          ],
        },
      })
    })
    await page.goto('/datos')
    await selectHistoricalXrays(page)
    await page.getByLabel('Fecha', { exact: true }).fill('2025-01-05')
    await page.getByLabel('Hora de inicio').fill('08:00')
    await page.getByLabel('Hora de fin').fill('09:00')
    await page.getByRole('button', { name: 'Consultar datos' }).click()
    return page.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
  }

  test('lets a visitor download ROSAC data but not GOES data', async ({ page, context }) => {
    const fixture = await createSignedInUser(context, 'VISITOR')
    try {
      const rosac = await queryRosacSpectrum(page)
      await expect(rosac.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
      await expect(rosac.getByRole('button', { name: 'Descargar datos (CSV)' })).toBeEnabled()

      const goes = await queryHistoricalXrays(page)
      await expect(goes.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
      await expect(goes.getByRole('button', { name: 'Descargar datos (CSV)' })).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })

  test('lets an administrator download GOES data', async ({ page, context }) => {
    const fixture = await createSignedInUser(context, 'ADMIN')
    try {
      const goes = await queryHistoricalXrays(page)
      await expect(goes.getByRole('button', { name: 'Descargar datos (CSV)' })).toBeEnabled()
    } finally {
      await fixture.cleanup()
    }
  })

  test('offers no download for SUVI images, even to an administrator', async ({
    page,
    context,
  }) => {
    const fixture = await createSignedInUser(context, 'ADMIN')
    try {
      await page.goto('/datos')
      await page.getByRole('combobox', { name: 'Instrumento y producto' }).click()
      await page.getByRole('treeitem', { name: /^SUVI/ }).click()
      await page.getByRole('treeitem', { name: /Fe171/ }).click()
      await page.getByRole('button', { name: 'Consultar datos' }).click()

      const results = page.getByRole('region', { name: /Imágenes solares: 171 Å/ })
      await expect(results.getByRole('img').first()).toBeVisible()
      await expect(results.getByRole('heading', { name: 'Descargas' })).toHaveCount(0)
      await expect(results.getByRole('button', { name: /descargar/i })).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
})

test('exposes ROSAC as a clearly simulated dynamic-spectrum source', async ({ page }) => {
  await page.goto('/datos')
  await page.getByRole('combobox', { name: 'Fuente de datos' }).click()
  await page.getByRole('option', { name: /ROSAC/ }).click()
  await page.getByRole('combobox', { name: 'Instrumento y producto' }).click()
  await page.getByRole('treeitem', { name: /^ROSAC-I2/ }).click()
  await page.getByRole('treeitem', { name: /Espectro dinámico/ }).click()
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Hora de fin').fill('08:20')
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(page.getByText('Simulación')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Espectro dinámico simulado de ROSAC' })).toBeVisible()
  await expect(page.getByText(/Datos simulados para preparar la integración/)).toBeVisible()
})

test('rejects an invalid time range without calling the public endpoint', async ({ page }) => {
  await page.goto('/datos')
  await selectHistoricalXrays(page)
  let requests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/scientific-data') requests += 1
  })

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
  await selectHistoricalXrays(page)
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(
    page.getByRole('status').filter({ hasText: 'No hay datos disponibles' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
})

test('keeps the scientific query usable without horizontal overflow on mobile', async ({
  page,
}) => {
  await mockObservedXrays(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/datos')
  await selectHistoricalXrays(page)
  await page.getByRole('button', { name: 'Consultar datos' }).click()

  await expect(page.getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

for (const width of [320, 768, 1440]) {
  test(`separates today's solar row from the query at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/datos')
    const solar = page.getByRole('region', { name: 'El Sol de hoy', exact: true })
    const query = page.getByRole('region', { name: 'Configure los datos que desea visualizar' })
    const images = solar.getByRole('img', { name: 'Imagen solar de GOES: 195 Å' })
    await expect(images).toHaveCount(5)
    await expect
      .poll(() => images.first().evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0)
    const solarBox = (await solar.boundingBox())!
    const queryBox = (await query.boundingBox())!
    expect(solarBox.y + solarBox.height).toBeLessThan(queryBox.y)
    expect(solarBox.x + solarBox.width).toBeLessThanOrEqual(width)
    expect(await query.getByRole('img').count()).toBe(0)
    await expect(query.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText(
      'EXIS',
    )
    await expect(query.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText(
      'Sensores de irradiancia ultravioleta extrema y rayos X',
    )
    const imageBoxes = await Promise.all((await images.all()).map((image) => image.boundingBox()))
    for (const box of imageBoxes) expect(box!.y).toBe(imageBoxes[0]!.y)
    if (width === 1440) {
      for (const image of await images.all()) await expect(image).toBeInViewport()
    }
    const strip = solar.getByRole('region', { name: 'Imágenes del Sol de hoy' })
    if (width === 320) {
      await strip.focus()
      await strip.press('End')
      await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
      await strip.press('Home')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const banner = query.getByRole('complementary', { name: 'Permisos de consulta y descarga' })
    await expect(banner).toContainText('necesita una cuenta e iniciar sesión')
    await expect(solar).not.toContainText(/CITIC|LASCE|NOAA/)
    await page.screenshot({
      path: testInfo.outputPath(`solar-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    })
    if (width === 320) {
      const accessibility = await new AxeBuilder({ page })
        .include('.solar-today')
        .include('.data-explorer')
        .analyze()
      expect(accessibility.violations).toEqual([])
    }
  })
}

test('changes the daily band and range without modifying the lower query or reloading', async ({
  page,
}) => {
  await page.goto('/datos')
  const solar = page.getByRole('region', { name: 'El Sol de hoy', exact: true })
  await expect(solar.getByRole('img')).toHaveCount(5)
  await page.getByLabel('Fecha', { exact: true }).fill('2025-01-05')
  let navigations = 0
  page.on('framenavigated', () => {
    navigations += 1
  })
  await solar.getByRole('radio', { name: '195 Å' }).focus()
  await solar.getByRole('radio', { name: '195 Å' }).press('ArrowLeft')
  await expect(solar.getByRole('radio', { name: '171 Å' })).toBeChecked()
  await expect(solar.getByRole('img', { name: 'Imagen solar de GOES: 171 Å' })).toHaveCount(5)
  await solar.getByRole('radio', { name: '171 Å' }).press('ArrowLeft')
  await expect(solar.getByRole('status')).toContainText('Aún no hay imágenes para esta selección')
  await solar.getByRole('radio', { name: '131 Å' }).press('ArrowRight')
  await expect(solar.getByRole('img')).toHaveCount(5)
  const requestPromise = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/scientific-data',
  )
  await solar.getByRole('combobox', { name: 'Rango de hoy (UTC)' }).click()
  await page.getByRole('option', { name: 'Últimas 3 horas' }).click()
  const parameters = new URL((await requestPromise).url()).searchParams
  expect(parameters.get('product')).toBe('Fe171')
  expect(parameters.get('date')).not.toBe('2025-01-05')
  const start = Date.parse(`${parameters.get('date')}T${parameters.get('startTime')}:00Z`)
  const end = Date.parse(`${parameters.get('date')}T${parameters.get('endTime')}:00Z`)
  expect(end - start).toBeLessThanOrEqual(3 * 3_600_000)
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2025-01-05')
  await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText('EXIS')
  expect(navigations).toBe(0)
})

test('replaces broken daily images while preserving the manual consultation', async ({ page }) => {
  await page.route('**/_next/image?**', async (route) => {
    if (
      decodeURIComponent(route.request().url()).includes(
        suviFrameUrl('Fe195', 0).slice(0, SUVI_FRAME_PREFIX.length + 2),
      )
    )
      return route.fulfill({ status: 404, body: '' })
    return route.fallback()
  })
  await page.goto('/datos')
  const solar = page.getByRole('region', { name: 'El Sol de hoy', exact: true })
  await expect(
    solar.getByRole('status').filter({ hasText: 'Esta imagen solar no está disponible' }),
  ).toHaveCount(5)
  await expect(solar.getByRole('img')).toHaveCount(0)
  await solar.getByRole('radio', { name: '171 Å' }).check()
  await expect(solar.getByRole('img')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
})

test('recovers from a daily source failure without blocking the query form', async ({ page }) => {
  await page.route('**/api/scientific-data?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('product') === 'Fe195')
      return route.fulfill({ status: 502, json: { error: 'Source unavailable' } })
    return route.fallback()
  })
  await page.goto('/datos')
  const solar = page.getByRole('region', { name: 'El Sol de hoy', exact: true })
  await expect(solar.getByRole('alert')).toContainText('No fue posible cargar las imágenes de GOES')
  await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toBeEnabled()
  await solar.getByRole('radio', { name: '171 Å' }).check()
  await expect(solar.getByRole('img')).toHaveCount(5)
})

test('selects instruments without requests and keeps manual SUVI separate from today', async ({
  page,
}) => {
  await page.goto('/datos')
  const solar = page.getByRole('region', { name: 'El Sol de hoy', exact: true })
  const query = page.getByRole('region', { name: 'Configure los datos que desea visualizar' })
  await expect(solar.getByRole('img')).toHaveCount(5)
  let requests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/scientific-data') requests += 1
  })
  await query.getByRole('combobox', { name: 'Instrumento y producto' }).click()
  await page.getByRole('treeitem', { name: /^SUVI/ }).click()
  await page.getByRole('treeitem', { name: /171 Å/ }).click()
  expect(requests).toBe(0)
  await expect(query.getByRole('img')).toHaveCount(0)
  await query.getByRole('button', { name: 'Consultar datos' }).click()
  await expect(query.getByRole('img', { name: 'Imagen solar de GOES: 171 Å' })).toHaveCount(8)
  await expect(solar.getByRole('radio', { name: '195 Å' })).toBeChecked()
  await expect(solar.getByRole('img', { name: 'Imagen solar de GOES: 195 Å' })).toHaveCount(5)
})
