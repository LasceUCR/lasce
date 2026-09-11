import { expect, test } from '@playwright/test'

for (const width of [1440, 1280, 768, 390]) {
  test(`opens the scientific tools from navigation without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const isMobileMenu = width <= 1400
    if (isMobileMenu) {
      await page.getByLabel('Abrir navegación').click()
    }
    const navigation = page.getByRole('navigation', {
      name: isMobileMenu ? 'Navegación móvil' : 'Navegación principal',
    })
    await expect(navigation.getByRole('link', { name: 'Instrumentación' })).toHaveCount(0)
    await navigation.getByRole('link', { name: 'Herramientas científicas' }).click()

    await expect(page).toHaveURL(/\/herramientas-cientificas$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Herramientas científicas' }),
    ).toBeVisible()

    for (const [title, href] of [
      ['SWAAT', 'https://swaat.up.railway.app/'],
      ['SWAPRO', 'https://swapro.up.railway.app/'],
    ] as const) {
      const card = page.getByRole('article', { name: title, exact: true })
      await expect(card.getByRole('heading', { level: 2, name: title })).toBeVisible()
      const link = card.getByRole('link', { name: `Acceder a ${title}` })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/herramientas-cientificas$/,
    )
    await expect(page).toHaveTitle('Herramientas científicas | LASCE')
  })
}

test('redirects the former instrumentation address to scientific tools', async ({ page }) => {
  await page.goto('/instrumentacion')
  await expect(page).toHaveURL(/\/herramientas-cientificas$/)
  await expect(page.getByRole('heading', { level: 2, name: 'SWAAT' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'SWAPRO' })).toBeVisible()
})

test('keeps data as a separate public consultation section', async ({ page }) => {
  await page.goto('/datos')
  await expect(page.getByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Consultar datos' })).toBeVisible()
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Acceder a SW/ })).toHaveCount(0)
})
