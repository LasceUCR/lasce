import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

// LASCE-ADM-001 (#462): the shared footer must stay clear of the Administration sidebar.

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

async function boxes(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const { left, right, top, bottom } = element.getBoundingClientRect()
      return { left, right, top: top + scrollY, bottom: bottom + scrollY }
    }
    return {
      footer: rect('.site-footer'),
      sidebar: rect('.admin-sidebar'),
      content: rect('.admin-content'),
      sidebarFixed:
        getComputedStyle(document.querySelector('.admin-sidebar')!).position === 'fixed',
      pageHeight: document.documentElement.scrollHeight,
      noOverflow: document.documentElement.scrollWidth <= innerWidth,
    }
  })
}

for (const viewport of viewports) {
  test(`keeps the footer below the content and clear of the sidebar (${viewport.name})`, async ({
    page,
    context,
  }) => {
    const fixture = await createSignedInUser(context, 'ADMIN')
    try {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      // Resumen is longer than the viewport at every size.
      await page.goto('/administracion')
      await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()

      const footer = page.locator('.site-footer')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Contacto' })).toBeVisible()

      const layout = await boxes(page)
      expect(layout.footer).not.toBeNull()
      expect(layout.content).not.toBeNull()
      expect(layout.noOverflow).toBe(true)
      // After all the content, and nothing hidden past the end of the page.
      expect(layout.footer!.top).toBeGreaterThanOrEqual(layout.content!.bottom - 1)
      expect(layout.footer!.bottom).toBeLessThanOrEqual(layout.pageHeight + 1)

      if (layout.sidebarFixed) {
        // Desktop: the footer starts where the fixed sidebar ends.
        expect(layout.footer!.left).toBeGreaterThanOrEqual(layout.sidebar!.right - 1)
      } else {
        // Narrow screens: the sidebar is a bar at the top and the footer takes the full width.
        expect(layout.footer!.left).toBeLessThanOrEqual(1)
      }
    } finally {
      await fixture.cleanup()
    }
  })
}

test('keeps the footer at the bottom of the viewport on a short page', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    // With no downloads recorded, Descargas is shorter than the viewport.
    await page.goto('/administracion/descargas')
    await expect(page.getByRole('heading', { level: 1, name: 'Descargas' })).toBeVisible()

    const layout = await boxes(page)
    const short = layout.content!.bottom + (layout.footer!.bottom - layout.footer!.top) <= 900
    test.skip(!short, 'Descargas has enough rows to be longer than the viewport')

    // Pinned to the bottom edge, with no empty band below it and no scroll to reach it.
    expect(Math.abs(layout.footer!.bottom - 900)).toBeLessThanOrEqual(1)
    expect(layout.pageHeight).toBeLessThanOrEqual(901)
  } finally {
    await fixture.cleanup()
  }
})
