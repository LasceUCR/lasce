import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// The new navigation does not depend on the live solar feed or external map tiles.
test.beforeEach(async ({ page }) => {
  await page.route('**/*.arcgisonline.com/**', (route) => route.abort())
  await page.route('**/api/scientific-data?**', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable in navigation test' } }),
  )
})

for (const width of [1440, 768, 390, 320]) {
  test(`shows three public instrument cards without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const response = await page.goto('/radioastronomia')
    expect(response?.status()).toBe(200)
    const section = page.getByRole('region', { name: '6. Instrumentos científicos' })
    await expect(section.getByRole('article')).toHaveCount(3)
    const images = section.getByRole('img', { name: /Imagen ilustrativa de la galería ROSAC/ })
    await expect(images).toHaveCount(3)
    await expect(section.getByRole('link')).toHaveCount(2)
    await expect(
      section.getByRole('button', { name: 'Consultar simulación del instrumento 3' }),
    ).toBeDisabled()
    await expect(section.getByText(/integración en la sección de datos/)).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await section.scrollIntoViewIfNeeded()
    for (const image of await images.all()) {
      await expect(image).toBeVisible()
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
        .toBeGreaterThan(0)
    }
    const results = await new AxeBuilder({ page })
      .include('#instrumentos')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await section.screenshot({
      path: test.info().outputPath('instrument-cards.png'),
      style: '.site-header, .skip-link, nextjs-portal { visibility: hidden; }',
    })
  })
}

for (const [number, product, parameter] of [
  [1, 'Serie temporal de prueba', 'Intensidad simulada'],
  [2, 'Espectro dinámico de prueba', 'Intensidad espectral simulada'],
] as const) {
  test(`opens the query with ROSAC instrument ${number} selected using the keyboard`, async ({
    page,
  }) => {
    await page.goto('/radioastronomia')
    const link = page.getByRole('link', { name: `Consultar simulación del instrumento ${number}` })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(
      new RegExp(`/datos\\?source=ROSAC&instrument=ROSAC-I${number}#scientific-query-title$`),
    )
    await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toContainText('ROSAC')
    const productSelect = page.getByRole('combobox', { name: 'Instrumento y producto' })
    await expect(productSelect).toContainText(product)
    await expect(page.getByRole('combobox', { name: 'Canal o parámetro' })).toContainText(parameter)
    const heading = page.getByRole('heading', { name: 'Configure los datos que desea visualizar' })
    await expect(heading).toBeInViewport()
    await heading.focus()
    await expect(heading).toHaveCSS('outline-style', 'none')
    await page.keyboard.press('Tab')
    const source = page.getByRole('combobox', { name: 'Fuente de datos' })
    await expect(source).toBeFocused()
    await expect(source).not.toHaveCSS('outline-style', 'none')
    await expect(page.getByText(/todos los resultados de esta fuente son simulados/)).toBeVisible()
    await productSelect.click()
    await expect(
      page.getByRole('treeitem', { name: /Instrumento [12] \(por definir\)/ }),
    ).toHaveCount(2)
    await expect(page.getByRole('treeitem', { name: /Instrumento 3/ })).toHaveCount(0)
  })
}

test('keeps the default query for invalid links and the third pending instrument', async ({
  page,
}) => {
  await page.goto('/datos?source=ROSAC&instrument=ROSAC-I3')
  await expect(page.getByRole('combobox', { name: 'Fuente de datos' })).toContainText('GOES')
  await expect(page.getByRole('combobox', { name: 'Instrumento y producto' })).toContainText('SFXR')
})

test('ROSAC disables researcher flip animations with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/radioastronomia')
  await expect(page.locator('.researcher-card-inner').first()).toHaveCSS(
    'transition-duration',
    '0s',
  )
})
