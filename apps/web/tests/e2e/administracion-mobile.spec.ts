import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

const phones = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]

const sections = ['Resumen', 'Descargas', 'Usuarios', 'Permisos', 'Infraestructura']

function adminMenu(page: Page) {
  return page.getByRole('navigation', { name: 'Panel de administración' })
}

function menuToggle(page: Page) {
  return adminMenu(page).getByRole('button', { name: /Menú/ })
}

async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
}

for (const viewport of phones) {
  test(`collapses the admin menu into a bar at ${viewport.width}px`, async ({ page, context }) => {
    const fixture = await createSignedInUser(context, 'ADMIN')
    try {
      await page.setViewportSize(viewport)
      await page.goto('/administracion')

      const toggle = menuToggle(page)
      const usuarios = adminMenu(page).getByRole('link', { name: 'Usuarios', exact: true })
      await expect(toggle).toBeVisible()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(toggle).toContainText('Resumen')
      await expect(usuarios).toBeHidden()
      expect(await hasNoHorizontalOverflow(page)).toBe(true)

      // The bar sits right under the sticky header, with no gap and no overlap.
      const header = await page.getByRole('banner').boundingBox()
      const bar = await adminMenu(page).boundingBox()
      expect(header).not.toBeNull()
      expect(bar).not.toBeNull()
      expect(
        Math.abs((header?.y ?? 0) + (header?.height ?? 0) - (bar?.y ?? 0)),
      ).toBeLessThanOrEqual(1)

      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      for (const label of sections) {
        await expect(adminMenu(page).getByRole('link', { name: label, exact: true })).toBeVisible()
      }
      expect(await hasNoHorizontalOverflow(page)).toBe(true)
      // Scoped to the menu: the Resumen page has its own, older contrast findings.
      expect(
        (
          await new AxeBuilder({ page })
            .include('.admin-sidebar')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([])

      await usuarios.click()
      await expect(page).toHaveURL(/\/administracion\/usuarios$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(toggle).toContainText('Usuarios')
      await expect(usuarios).toBeHidden()

      await toggle.click()
      await page.keyboard.press('Tab')
      await expect(
        adminMenu(page).getByRole('link', { name: 'Resumen', exact: true }),
      ).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(toggle).toBeFocused()
    } finally {
      await fixture.cleanup()
    }
  })
}

test('keeps the fixed sidebar and no toggle on desktop', async ({ page, context }) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/administracion')

    await expect(menuToggle(page)).toBeHidden()
    for (const label of sections) {
      await expect(adminMenu(page).getByRole('link', { name: label, exact: true })).toBeVisible()
    }
  } finally {
    await fixture.cleanup()
  }
})

test('offers an anonymous visitor only the public sections in the bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/administracion')

  await menuToggle(page).click()

  await expect(adminMenu(page).getByRole('link')).toHaveText(['Resumen', 'Infraestructura'])
})
