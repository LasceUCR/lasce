import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import es from '../../messages/es.json' with { type: 'json' }
import en from '../../messages/en.json' with { type: 'json' }

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
    await navigation.getByText('Recursos', { exact: true }).click()
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
      await expect(card.getByRole('heading', { level: 3, name: title })).toBeVisible()
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

test('keeps data as a separate public consultation section', async ({ page }) => {
  await page.goto('/datos')
  await expect(page.getByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Consultar datos' })).toBeVisible()
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Acceder a SW/ })).toHaveCount(0)
})

for (const [locale, messages] of Object.entries({ es, en })) {
  for (const width of [320, 820, 1440]) {
    test(`presents scientific tools and home navigation in ${locale} at ${width}px`, async ({
      context,
      page,
    }) => {
      await context.addCookies([
        { name: 'lasce_locale', value: locale, url: 'http://localhost:3000' },
      ])
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/herramientas-cientificas')

      const copy = messages.scientificTools
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { level: 1, name: copy.hero.title })).toBeVisible()
      await expect(main.getByText(copy.hero.intro, { exact: true })).toBeVisible()
      const section = main.getByRole('region', { name: copy.list.title })
      await expect(section).toHaveClass(/topic-section/)
      await expect(section).not.toHaveClass(/topic-page-footer/)
      await expect(section.getByRole('heading', { level: 2, name: copy.list.title })).toBeVisible()

      const icons: string[] = []
      for (const [title, description] of [
        ['SWAAT', copy.tools.swaat],
        ['SWAPRO', copy.tools.swapro],
      ] as const) {
        const card = section.getByRole('article', { name: title })
        await expect(card.getByRole('heading', { level: 3, name: title })).toBeVisible()
        await expect(card.getByText(description, { exact: true })).toBeVisible()
        const link = card.getByRole('link', { name: copy.list.access.replace('{title}', title) })
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        await expect(link.locator('svg')).toBeVisible()
        await expect(card.locator('.info-card-icon svg')).toBeVisible()
        icons.push(await card.locator('.info-card-icon svg').innerHTML())

        for (const element of [
          card,
          card.getByRole('heading'),
          card.getByText(description),
          link,
        ]) {
          const dimensions = await element.evaluate((node) => ({
            width: node.clientWidth,
            scrollWidth: node.scrollWidth,
            height: node.clientHeight,
            scrollHeight: node.scrollHeight,
          }))
          expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1)
          expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height + 1)
        }
      }
      expect(icons[0]).not.toBe(icons[1])
      await expect(main.getByText(/Los enlaces se abren|The links open in a new tab/)).toHaveCount(
        0,
      )

      const footer = main.locator('.topic-page-footer')
      await expect(footer).toHaveCount(1)
      await expect(footer.getByRole('article')).toHaveCount(0)
      const backLink = footer.getByRole('link', { name: messages.common.backToHome })
      await expect(backLink).toHaveAttribute('href', '/')
      const sectionBox = await section.boundingBox()
      const footerBox = await footer.boundingBox()
      expect(sectionBox).not.toBeNull()
      expect(footerBox).not.toBeNull()
      expect(footerBox!.y).toBeGreaterThanOrEqual(sectionBox!.y + sectionBox!.height)

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      if (width === 1440) {
        const accessibility = await new AxeBuilder({ page }).include('main').analyze()
        expect(accessibility.violations).toEqual([])
      }

      await backLink.click()
      await expect(page).toHaveURL('/')
    })
  }
}
