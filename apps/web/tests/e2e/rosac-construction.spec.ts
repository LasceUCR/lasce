import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { rosacConstructionContent } from '../../app/lib/rosac-construction'

for (const width of [1440, 768, 390, 320]) {
  test(`manually navigates photographs within the selected stage in a stable 3:2 frame at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.clock.install()
    await page.goto('/radioastronomia')
    const section = page.getByRole('region', { name: '3. Construcción del ROSAC' })
    // The shared header already overflows at 320px without this section.
    const baselineWidth = await section.evaluate((element) => {
      element.style.display = 'none'
      const result = document.documentElement.scrollWidth
      element.style.display = ''
      return result
    })
    if (width > 320) expect(baselineWidth).toBeLessThanOrEqual(width)
    await section.scrollIntoViewIfNeeded()
    await expect(section.getByRole('button', { name: 'Fotografía siguiente' })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Anterior', exact: true })).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Siguiente', exact: true })).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Etapa anterior' })).toBeDisabled()
    await expect(section.getByText('Etapa 1 de 5', { exact: true })).toHaveCount(0)
    await expect(section.getByText('Pausar fotografías', { exact: true })).toHaveCount(0)
    const stageFont = await section
      .getByRole('button', { name: 'Etapa siguiente' })
      .evaluate((element) => getComputedStyle(element).fontFamily)
    expect(stageFont).toBe(
      await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily),
    )

    for (const [stageIndex, stage] of rosacConstructionContent.stages.entries()) {
      if (stageIndex > 0) await section.getByRole('button', { name: 'Etapa siguiente' }).click()
      await page.mouse.move(0, 0)
      await expect(section.getByRole('heading', { name: stage.title })).toBeVisible()
      for (const image of stage.images) {
        const photo = section.getByRole('img', { name: image.alt })
        await expect(photo).toBeVisible()
        await expect
          .poll(() =>
            photo.evaluate(
              (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true)
        const bounds = await photo.boundingBox()
        expect(bounds!.width / bounds!.height).toBeCloseTo(1.5, 2)
        if (stage.images.length > 1)
          await section.getByRole('button', { name: 'Fotografía siguiente' }).click()
      }
      await expect(section.getByRole('img', { name: stage.images[0].alt })).toBeVisible()
      await expect(section.getByRole('heading', { name: stage.title })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        Math.max(width, baselineWidth),
      )
      expect(
        await section.evaluate(
          (element) =>
            element.getBoundingClientRect().right <= innerWidth &&
            element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true)
      const accessibility = await new AxeBuilder({ page })
        .include('#construccion')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(accessibility.violations).toEqual([])
    }
    await expect(section.getByRole('button', { name: 'Etapa siguiente' })).toBeDisabled()
    await section.getByRole('button', { name: 'Etapa anterior' }).click()
    await expect(section.getByRole('heading', { name: 'Donación de equipo EATON' })).toBeVisible()
    await section.getByRole('button', { name: 'Etapa siguiente' }).click()
    await expect(section.getByRole('heading', { name: 'Instalación eléctrica' })).toBeVisible()
  })
}

test('keeps photographs static and supports keyboard navigation', async ({ page }) => {
  await page.clock.install()
  await page.goto('/radioastronomia')
  const section = page.locator('#construccion')
  const first = rosacConstructionContent.stages[0].images[0]
  await expect(section.getByRole('img', { name: first.alt })).toBeVisible()
  await page.clock.fastForward(60000)
  await expect(section.getByRole('img', { name: first.alt })).toBeVisible()
  const next = section.getByRole('button', { name: 'Fotografía siguiente' })
  await next.focus()
  await page.keyboard.press('Enter')
  await expect(
    section.getByRole('img', { name: rosacConstructionContent.stages[0].images[1].alt }),
  ).toBeVisible()
  await expect(next).toBeFocused()
  await page.keyboard.press('Space')
  await expect(section.getByRole('img', { name: first.alt })).toBeVisible()
})
