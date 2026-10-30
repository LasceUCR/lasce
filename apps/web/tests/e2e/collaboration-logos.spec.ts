import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { researchCollaborations } from '../../app/lib/research-collaborations'

for (const width of [320, 768, 1440]) {
  test(`shows the correct partner logos and accessible links without overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/colaboraciones-e-iniciativas')
    const section = page.getByRole('region', { name: 'Colaboraciones de investigación' })
    await expect(section.getByText('Nacional', { exact: true })).toHaveCount(2)
    await expect(section.getByText('Internacional', { exact: true })).toHaveCount(6)
    for (const partner of researchCollaborations) {
      const card = section.getByRole('article').filter({
        has: page.getByRole('heading', { name: partner.name, exact: true }),
      })
      await expect(card.getByText(partner.country, { exact: true })).toBeVisible()
      const logo = card.getByRole('img', { name: `Logotipo de ${partner.name}` })
      await logo.scrollIntoViewIfNeeded()
      await expect(logo).toBeVisible()
      await expect
        .poll(() =>
          logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true)
      const src = await logo.getAttribute('src')
      expect(decodeURIComponent(src!)).toContain(partner.logoPath!)
      expect(await logo.evaluate((image) => getComputedStyle(image).objectFit)).toBe('contain')
      const imageBox = (await logo.boundingBox())!
      const cardBox = (await card.boundingBox())!
      expect(imageBox.x).toBeGreaterThanOrEqual(cardBox.x)
      expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
      const link = card.getByRole('link', {
        name: `Sitio web oficial de ${partner.name} (abre en una pestaña nueva)`,
      })
      await expect(link).toHaveAttribute('href', partner.websiteUrl!)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link.getByRole('img', { name: `Logotipo de ${partner.name}` })).toBeVisible()
      await expect(card.getByText('Sitio web oficial', { exact: true })).toHaveCount(0)
      await link.focus()
      await expect(link).toBeFocused()
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await new AxeBuilder({ page }).include('#research-collaborations').analyze()).violations,
    ).toEqual([])
    await page.getByRole('heading', { level: 1 }).click()
    await page.screenshot({
      path: testInfo.outputPath(`collaborations-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  })
}

test('opens the linked logo with the keyboard while keeping LASCE available', async ({
  context,
  page,
}) => {
  // Avoid depending on a third-party server; still exercise the browser's new-tab navigation.
  await context.route('https://www.tec.ac.cr/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>TEC</title><h1>TEC</h1>',
    }),
  )
  await page.goto('/colaboraciones-e-iniciativas')
  const link = page.getByRole('link', {
    name: 'Sitio web oficial de Instituto Tecnológico de Costa Rica (abre en una pestaña nueva)',
  })
  await link.focus()
  const opened = context.waitForEvent('page')
  await page.keyboard.press('Enter')
  const partner = await opened
  await partner.waitForLoadState()
  await expect(partner).toHaveURL('https://www.tec.ac.cr/')
  expect(await partner.evaluate(() => window.opener === null)).toBe(true)
  await expect(page).toHaveURL(/\/colaboraciones-e-iniciativas$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Colaboraciones e Iniciativas')
  await partner.close()
})
