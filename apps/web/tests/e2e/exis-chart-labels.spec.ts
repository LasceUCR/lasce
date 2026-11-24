import { expect, test } from '@playwright/test'

for (const locale of ['es', 'en'] as const) {
  test.describe(`EXIS chart labels in ${locale}`, () => {
    test.use({ timezoneId: locale === 'es' ? 'America/Costa_Rica' : 'Pacific/Auckland' })

    for (const width of [320, 390, 1440]) {
      test(`keeps the axis and UTC interval readable at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 })
        await page
          .context()
          .addCookies([{ name: 'lasce_locale', value: locale, url: 'http://localhost:3000' }])
        await page.route('**/api/scientific-data?**', async (route) => {
          const parameters = new URL(route.request().url()).searchParams
          if (parameters.get('product') !== 'SFXR') return route.fallback()
          const query = Object.fromEntries(parameters)
          const start = Date.parse(`${query.date}T${query.startTime}:00Z`)
          let end = Date.parse(`${query.date}T${query.endTime}:00Z`)
          if (end < start) end += 86_400_000
          await route.fulfill({
            json: {
              query,
              instrument: { code: 'EXIS', name: 'EXIS' },
              product: { code: 'SFXR', name: 'SFXR' },
              parameter: { code: '0.1-0.8nm', label: '0.1–0.8 nm', unit: 'W/m²' },
              origin: { kind: 'observed', dataset: 'exis', resolution: 'sampled' },
              visualization: 'time-series',
              points: [
                { timestamp: new Date(start + 900_000).toISOString(), value: 2.1e-7 },
                { timestamp: new Date(end - 900_000).toISOString(), value: 4.2e-7 },
              ],
            },
          })
        })
        await page.goto(
          '/datos?source=GOES&product=SFXR&parameter=0.1-0.8nm&date=2025-12-31&startTime=23%3A30&endTime=00%3A30',
        )

        const chart = page.getByRole('img', { name: /^(Gráfica de|Chart of)/ })
        const axis = chart.getByText(locale === 'es' ? 'Flujo (W/m²)' : 'Flux (W/m²)')
        const interval = page.getByText(/^Interval[o]?:/)
        await expect(axis).toBeVisible()
        await expect(interval).toHaveText(
          locale === 'es'
            ? 'Intervalo: 31 dic 2025, 23:45:00 – 1 ene 2026, 00:15:00 UTC'
            : 'Interval: Dec 31, 2025, 23:45:00 – Jan 1, 2026, 00:15:00 UTC',
        )

        // Measure together: the results panel can still be scrolling into view.
        const { chartBox, axisBox, intervalBox, tickBoxes } = await chart.evaluate((svg) => {
          const bounds = (element: Element) => {
            const { x, y, width, height } = element.getBoundingClientRect()
            return { x, y, width, height }
          }
          return {
            chartBox: bounds(svg),
            axisBox: bounds(svg.querySelector('.data-chart-axis-label')!),
            intervalBox: bounds(svg.closest('figure')!.querySelector('.data-chart-time-range')!),
            tickBoxes: Array.from(
              svg.querySelectorAll('.data-chart-axis-text text, text.data-chart-axis-text'),
              bounds,
            ),
          }
        })
        expect(axisBox.x).toBeGreaterThanOrEqual(chartBox.x)
        expect(axisBox.y).toBeGreaterThanOrEqual(chartBox.y)
        expect(axisBox.y + axisBox.height).toBeLessThanOrEqual(chartBox.y + chartBox.height)
        expect(chartBox.x).toBeGreaterThanOrEqual(0)
        expect(chartBox.x + chartBox.width).toBeLessThanOrEqual(width)
        expect(intervalBox.y).toBeGreaterThanOrEqual(chartBox.y + chartBox.height)
        expect(intervalBox.x + intervalBox.width).toBeLessThanOrEqual(width)
        // The vertical title has its own margin, clear of every tick label.
        for (const tickBox of tickBoxes) {
          expect(axisBox.x + axisBox.width).toBeLessThanOrEqual(tickBox.x)
        }
        expect(
          await interval.evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        await chart
          .locator('..')
          .locator('..')
          .screenshot({
            path: testInfo.outputPath(`exis-${locale}-${width}.png`),
          })

        await page
          .getByLabel(locale === 'es' ? 'Fecha' : 'Date', { exact: true })
          .fill('2026-01-01')
        await page
          .getByLabel(locale === 'es' ? 'Hora de inicio (UTC)' : 'Start time (UTC)', {
            exact: true,
          })
          .fill('08:00')
        await page
          .getByLabel(locale === 'es' ? 'Hora de fin (UTC)' : 'End time (UTC)', { exact: true })
          .fill('09:00')
        await page
          .getByRole('button', {
            name: locale === 'es' ? 'Consultar datos' : 'Query data',
            exact: true,
          })
          .click()
        await expect(interval).toHaveText(
          locale === 'es'
            ? 'Intervalo: 1 ene 2026, 08:15:00 – 1 ene 2026, 08:45:00 UTC'
            : 'Interval: Jan 1, 2026, 08:15:00 – Jan 1, 2026, 08:45:00 UTC',
        )
      })
    }
  })
}
