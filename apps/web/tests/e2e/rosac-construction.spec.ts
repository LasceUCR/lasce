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
    const section = page.getByRole('region', { name: '4. Construcción del ROSAC' })
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
      for (const [imageIndex, image] of stage.images.entries()) {
        await expect(
          section.getByText(`Fotografía ${imageIndex + 1} de ${stage.images.length}`, {
            exact: true,
          }),
        ).toBeVisible()
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
        width,
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
    await expect(
      section.getByRole('heading', { name: rosacConstructionContent.stages.at(-2)!.title }),
    ).toBeVisible()
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
  const images = rosacConstructionContent.stages[0].images
  for (let index = 1; index <= images.length; index++) {
    await page.keyboard.press(index % 2 === 0 ? 'Space' : 'Enter')
    await expect(
      section.getByRole('img', { name: images[index % images.length]!.alt }),
    ).toBeVisible()
    await expect(next).toBeFocused()
  }
  await expect(section.getByRole('img', { name: first.alt })).toBeVisible()
})

test('shows a placeholder for a photograph that fails to load, keeping the stage usable', async ({
  page,
}) => {
  const stage = rosacConstructionContent.stages.at(-1)!
  const brokenImage = stage.images[0]
  await page.route(
    (url) => url.pathname === '/_next/image' && url.searchParams.get('url') === brokenImage.src,
    (route) => route.abort(),
  )
  await page.goto('/radioastronomia')
  const section = page.getByRole('region', { name: '4. Construcción del ROSAC' })
  await section.scrollIntoViewIfNeeded()
  for (let index = 0; index < rosacConstructionContent.stages.length - 1; index++) {
    await section.getByRole('button', { name: 'Etapa siguiente' }).click()
  }

  await expect(section.getByRole('heading', { name: stage.title })).toBeVisible()
  await expect(section.getByText('No fue posible cargar esta fotografía.')).toBeVisible()
  await expect(section.getByRole('img', { name: brokenImage.alt })).toHaveCount(0)
  // The rest of the stage stays usable: description and navigating to the next photo, which
  // loads fine, both keep working despite the failed one.
  await expect(section.getByText(stage.description)).toBeVisible()
  await section.getByRole('button', { name: 'Fotografía siguiente' }).click()
  await expect(section.getByRole('img', { name: stage.images[1].alt })).toBeVisible()
})
