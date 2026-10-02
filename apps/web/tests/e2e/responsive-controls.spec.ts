import { expect, test, type Locator } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  // Document coordinates stay comparable while focus scrolls the page smoothly.
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height }
  })
}

test.describe('responsive native controls', () => {
  test('closes navigation on an outside pointer after scrolling the menu', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('/')
    const navigation = page.getByRole('navigation', { name: 'Navegación móvil' })
    for (const point of [
      { x: 20, y: 200 },
      { x: 420, y: 20 },
    ]) {
      await page.getByLabel('Abrir navegación').click()
      await expect(navigation).toBeVisible()
      await navigation.getByRole('link').last().scrollIntoViewIfNeeded()
      await expect(navigation).toBeVisible()
      if (test.info().project.use.hasTouch) await page.touchscreen.tap(point.x, point.y)
      else await page.mouse.click(point.x, point.y)
      await expect(navigation).toBeHidden()
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    }
  })

  test('scrolls the mobile navigation to its last option in landscape', async ({ page }) => {
    await page.goto('/')
    for (const viewport of [
      { width: 667, height: 320 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport)
      await page.getByLabel('Abrir navegación').click()
      const navigation = page.getByRole('navigation', { name: 'Navegación móvil' })
      await navigation.getByText('Recursos', { exact: true }).click()
      const lastLink = navigation.getByRole('link').last()
      await lastLink.scrollIntoViewIfNeeded()
      await expect(lastLink).toBeInViewport()
      const panel = await navigation.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return {
          bottom: rect.bottom,
          height: innerHeight,
          scrollTop: element.scrollTop,
          overflows: element.scrollHeight > element.clientHeight,
          overflowY: getComputedStyle(element).overflowY,
        }
      })
      expect(panel.bottom).toBeLessThanOrEqual(panel.height)
      expect(panel.overflowY).toBe('auto')
      if (viewport.height <= 390) {
        expect(panel.overflows).toBe(true)
        expect(panel.scrollTop).toBeGreaterThan(0)
      }
      // The click proves the last option receives the pointer once scrolled into view.
      // Where it leads is covered by public-portal.spec.ts; waiting for that render here
      // made WebKit time out in `next dev` while the router was still rendering.
      await lastLink.click()
      await expect(navigation).toBeHidden()
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
      await page.goto('/')
    }
  })

  test('keeps the news modal fields and actions contained across viewport sizes', async ({
    page,
    context,
  }) => {
    const fixture = await createSignedInUser(context, 'ADMIN')
    try {
      await page.goto('/administracion')
      await page.getByRole('switch', { name: 'Modo edición' }).click()
      await page.goto('/noticias')
      await page.getByRole('button', { name: 'Agregar noticia' }).click()
      const dialog = page.getByRole('dialog', { name: 'Agregar noticia' })
      for (const width of [320, 375, 390, 760, 768, 820, 1440]) {
        for (const viewport of [
          { width, height: 900 },
          { width: 900, height: width },
        ]) {
          await page.setViewportSize(viewport)
          await expect(dialog).toBeVisible()
          const overflow = await dialog.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return (
              rect.left < 0 ||
              rect.right > innerWidth ||
              rect.top < 0 ||
              rect.bottom > innerHeight ||
              // The file picker is intentionally visually hidden behind its drop zone.
              Array.from(
                element.querySelectorAll('input:not([type="file"]), textarea, select, button'),
              ).some((control) => {
                const bounds = control.getBoundingClientRect()
                return (
                  bounds.left < rect.left ||
                  bounds.right > rect.right ||
                  control.scrollWidth > control.clientWidth
                )
              })
            )
          })
          expect(overflow).toBe(false)
          await dialog.getByRole('button', { name: 'Cancelar' }).scrollIntoViewIfNeeded()
          await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeInViewport()
        }
      }
      await dialog.getByRole('button', { name: 'Cancelar' }).click()
      await expect(dialog).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })

  for (const width of [320, 375, 390, 760, 768, 820, 1440]) {
    test(`contains readable date and time controls at ${width}px and after rotation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/datos')
      const date = page.getByLabel('Fecha', { exact: true })
      const range = page.getByRole('group', { name: 'Rango horario (UTC)' })
      const start = range.getByLabel(/Hora de inicio/)
      const end = range.getByLabel(/Hora de fin/)
      await expect(start).toBeEnabled()

      for (const viewport of [
        { width, height: 900 },
        { width: 900, height: width },
      ]) {
        await page.setViewportSize(viewport)
        await start.fill('08:00')
        await end.fill('09:00')
        await expect(start).toHaveValue('08:00')
        await expect(end).toHaveValue('09:00')
        // Read related rectangles in one frame: images above the form may still load.
        const [parent, first, second] = await range.evaluate((element) =>
          [element, ...element.querySelectorAll('input')].map((node) => {
            const rect = node.getBoundingClientRect()
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          }),
        )
        expect(parent).toBeDefined()
        expect(first).toBeDefined()
        expect(second).toBeDefined()
        if (!parent || !first || !second) throw new Error('Missing time range controls')
        const sideBySide = Math.abs(first.y - second.y) < 1
        if (sideBySide) {
          expect(second.x - first.x - first.width).toBeGreaterThanOrEqual(15)
        } else {
          expect(second.y - first.y - first.height).toBeGreaterThanOrEqual(15)
        }
        // Check that ample space retains the existing two-column presentation.
        if (parent.width >= 336) expect(sideBySide).toBe(true)
        if (parent.width < 336) expect(sideBySide).toBe(false)
        for (const bounds of [first, second]) {
          expect(bounds.x).toBeGreaterThanOrEqual(parent.x - 1)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width + 1)
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(parent.y + parent.height + 1)
          expect(bounds.height).toBeGreaterThanOrEqual(44)
        }
        for (const control of [date, start, end]) {
          const bounds = await box(control)
          expect(bounds.x).toBeGreaterThanOrEqual(0)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
          expect(
            await control.evaluate((element) => element.scrollWidth <= element.clientWidth),
          ).toBe(true)
        }
        if (viewport.width > 760) {
          const alignment = await page.evaluate(() => {
            const time = document.getElementById('scientific-end-time')!.getBoundingClientRect()
            const button = document
              .querySelector('.data-query-submit button')!
              .getBoundingClientRect()
            return Math.abs(time.bottom - button.bottom)
          })
          expect(alignment).toBeLessThanOrEqual(1)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
    })
  }
})
