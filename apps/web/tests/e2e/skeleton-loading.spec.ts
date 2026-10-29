import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

// #377: skeleton placeholders on /datos while "Sol hoy" and an instrument query load. The data
// API is answered by the test, so each state (loading, results, empty, error) is shown on demand
// and the suite needs neither InfluxDB nor the GOES feeds.

const API = '**/api/scientific-data?*'

type Answer = 'images' | 'empty' | 'error' | 'series'

function queryOf(route: Route) {
  return Object.fromEntries(new URL(route.request().url()).searchParams)
}

function imagesResult(query: Record<string, string>, count: number) {
  return {
    query,
    instrument: { code: 'SUVI', name: 'Solar Ultraviolet Imager' },
    product: { code: query.product, name: `Imagen solar ${query.product}` },
    parameter: { code: 'image', label: 'Imagen', unit: '' },
    origin: { kind: 'observed', provider: 'GOES', notice: 'Fuente: GOES.' },
    visualization: 'image-sequence',
    images: Array.from({ length: count }, (_, index) => ({
      timestamp: `${query.date}T${String(index).padStart(2, '0')}:00:00Z`,
      imageUrl: '/images/decorative/goes-suvi-195-fallback.png',
      alt: `Imagen solar de prueba ${index}`,
    })),
  }
}

function seriesResult(query: Record<string, string>) {
  return {
    query,
    instrument: { code: 'EXIS', name: 'EXIS' },
    product: { code: query.product, name: 'Flujo solar: rayos X' },
    parameter: { code: query.parameter, label: 'Banda larga', unit: 'W/m²' },
    origin: { kind: 'observed', provider: 'GOES', notice: 'Fuente: GOES.' },
    visualization: 'time-series',
    points: [
      { timestamp: `${query.date}T08:00:00Z`, value: 0.0000064 },
      { timestamp: `${query.date}T08:15:00Z`, value: 0.0000078 },
    ],
  }
}

/**
 * Answers a held request. A request the page already gave up on (React's development mode runs
 * effects twice, aborting the first fetch) can no longer be answered, which is fine.
 */
async function answer(route: Route, kind: Answer) {
  await respond(route, kind).catch(() => undefined)
}

async function respond(route: Route, kind: Answer) {
  const query = queryOf(route)
  if (kind === 'error') return route.fulfill({ status: 503, json: { error: 'unavailable' } })
  const body =
    kind === 'series' ? seriesResult(query) : imagesResult(query, kind === 'empty' ? 0 : 5)
  return route.fulfill({ status: 200, json: body })
}

/**
 * Holds every "Sol hoy" request (`parameter=image`) and every query of the form until the test
 * releases them, so the placeholders can be inspected.
 */
async function holdRequests(page: Page) {
  const held: { route: Route; solar: boolean }[] = []
  await page.route(API, (route) => {
    held.push({ route, solar: queryOf(route).parameter === 'image' && !queryOf(route).jobId })
  })
  return {
    async releaseSolar(kind: Answer) {
      await expect.poll(() => held.some((entry) => entry.solar)).toBe(true)
      for (const entry of held.filter((each) => each.solar)) await answer(entry.route, kind)
      held.splice(0, held.length, ...held.filter((each) => !each.solar))
    },
    async releaseQuery(kind: Answer) {
      await expect.poll(() => held.some((entry) => !entry.solar)).toBe(true)
      for (const entry of held.filter((each) => !each.solar)) await answer(entry.route, kind)
      held.splice(0, held.length, ...held.filter((each) => each.solar))
    },
  }
}

function solarToday(page: Page) {
  return page.locator('#solar-today-results')
}

function queryResults(page: Page) {
  return page.locator('#scientific-results')
}

test.describe('Sol hoy', () => {
  test('shows five image placeholders while loading, then the images in their place', async ({
    page,
  }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')

    await expect(solarToday(page)).toHaveAttribute('aria-busy', 'true')
    await expect(solarToday(page).locator('[inert][aria-hidden="true"] li')).toHaveCount(5)
    await expect(solarToday(page).getByRole('status')).toHaveText(
      'Cargando imágenes del Sol de hoy…',
    )
    await expect(page.getByText('Aún no hay imágenes para esta selección')).toHaveCount(0)
    const before = await solarToday(page).boundingBox()

    await requests.releaseSolar('images')

    await expect(solarToday(page)).not.toHaveAttribute('aria-busy')
    await expect(page.getByRole('region', { name: 'Imágenes del Sol de hoy' })).toBeVisible()
    await expect(solarToday(page).getByRole('img')).toHaveCount(5)
    // The strip replaces the placeholders without moving the section around it.
    const after = await solarToday(page).boundingBox()
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2)
  })

  test('shows the empty state once loading finds no images', async ({ page }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('empty')

    await expect(page.getByText('Aún no hay imágenes para esta selección')).toBeVisible()
    await expect(solarToday(page)).not.toHaveAttribute('aria-busy')
  })

  test('shows the error, not an endless placeholder, when the source fails', async ({ page }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('error')

    await expect(solarToday(page).getByRole('alert')).toContainText('No fue posible cargar')
    await expect(solarToday(page)).not.toHaveAttribute('aria-busy')
    await expect(solarToday(page).locator('[inert]')).toHaveCount(0)
  })

  test('announces the loading state in English on the English site', async ({ page, context }) => {
    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
    await holdRequests(page)
    await page.goto('/datos')

    await expect(solarToday(page).getByRole('status')).toHaveText("Loading today's solar images…")
  })
})

test.describe('instrument query', () => {
  test('draws the results card as a chart while a time series loads, then the result', async ({
    page,
  }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('images')

    await page.getByRole('button', { name: 'Consultar datos' }).click()

    await expect(queryResults(page)).toHaveAttribute('aria-busy', 'true')
    await expect(
      queryResults(page).locator('[inert] [data-visualization="time-series"]'),
    ).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Cargando datos' })).toBeVisible()

    await requests.releaseQuery('series')

    await expect(queryResults(page)).not.toHaveAttribute('aria-busy')
    await expect(queryResults(page).getByRole('img', { name: /Gráfica de/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Flujo solar: rayos X/ })).toBeFocused()
  })

  test('removes the placeholders and shows the error when the query fails', async ({ page }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('images')

    await page.getByRole('button', { name: 'Consultar datos' }).click()
    await expect(queryResults(page)).toHaveAttribute('aria-busy', 'true')
    await requests.releaseQuery('error')

    // Next.js keeps its own empty route announcer with the alert role, so match the message itself.
    await expect(
      page.getByRole('alert').filter({ hasText: 'No fue posible consultar' }),
    ).toBeVisible()
    await expect(queryResults(page)).toHaveCount(0)
  })

  test('removes the placeholders when the visitor cancels', async ({ page }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('images')

    await page.getByRole('button', { name: 'Consultar datos' }).click()
    await expect(queryResults(page)).toHaveAttribute('aria-busy', 'true')
    await page.getByRole('button', { name: 'Cancelar consulta' }).click()

    await expect(queryResults(page)).toHaveCount(0)
  })
})

test.describe('placeholders', () => {
  test('follow the layout from phones to desktops without sideways scrolling', async ({ page }) => {
    const requests = await holdRequests(page)
    await page.goto('/datos')
    await requests.releaseSolar('images')
    await page.getByRole('button', { name: 'Consultar datos' }).click()
    await expect(queryResults(page)).toHaveAttribute('aria-busy', 'true')

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
    }
  })

  test('stop their animation when the visitor prefers reduced motion', async ({ page }) => {
    await holdRequests(page)
    // The frame of the first image card: the shape that carries the shimmer.
    const placeholder = solarToday(page).locator('[inert] span[style*="aspect-ratio"]').first()

    await page.goto('/datos')
    await expect(placeholder).toBeVisible()
    expect(
      await placeholder.evaluate((element) => getComputedStyle(element).animationName),
    ).not.toBe('none')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await placeholder.evaluate((element) => getComputedStyle(element).animationName)).toBe(
      'none',
    )
  })

  test('cannot take keyboard focus and pass WCAG A and AA automated checks', async ({ page }) => {
    await holdRequests(page)
    await page.goto('/datos')
    await expect(solarToday(page)).toHaveAttribute('aria-busy', 'true')

    const focusable = await solarToday(page)
      .locator('[inert]')
      .evaluate(
        (element) =>
          element.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
      )
    expect(focusable).toBe(0)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
