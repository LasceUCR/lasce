import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createAdminFixture } from './helpers/admin-users'

for (const width of [390, 1440]) {
  test(`searches users and preserves role indicators at ${width}px`, async ({ page, context }) => {
    const fixture = await createAdminFixture(context)
    try {
      await page.setViewportSize({ width, height: 900 })
      const response = await page.goto('/administracion/usuarios')
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle('Usuarios | Administración | LASCE')
      const table = page.getByRole('table', { name: 'Usuarios y roles' })
      await expect(table.getByRole('row')).toHaveCount((await fixture.prisma.user.count()) + 1)
      const search = page.getByRole('searchbox', { name: 'Buscar usuarios' })
      await search.fill(fixture.target.email)
      await search.press('Enter')
      await expect(table.getByRole('row')).toHaveCount(2)
      const admin = table.getByRole('checkbox', {
        name: `Visitante: Usuario QA (${fixture.target.email})`,
      })
      await expect(admin).toBeChecked()
      await expect(admin).toBeEnabled()
      const userName = table.getByRole('button', { name: 'Usuario QA' })
      await userName.click()
      const dialog = page.getByRole('dialog', { name: 'Información del usuario' })
      await expect(dialog.getByText('Institución QA', { exact: true })).toBeVisible()
      await expect(dialog.getByText('Costa Rica', { exact: true })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused()
      const dialogAccessibility = await new AxeBuilder({ page })
        .include('dialog')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(dialogAccessibility.violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(userName).toBeFocused()
      await expect(search).toHaveValue(fixture.target.email)
      await userName.press('Enter')
      await dialog.getByRole('button', { name: 'Cerrar' }).click()
      await expect(dialog).toHaveCount(0)
      await fixture.prisma.user.update({ where: { id: fixture.target.id }, data: { role: null } })
      await page.reload()
      await search.fill(fixture.target.email)
      await expect(table.getByRole('row')).toHaveCount(2)
      for (const checkbox of await table.getByRole('checkbox').all()) {
        await expect(checkbox).not.toBeChecked()
        await expect(checkbox).toBeEnabled()
      }
      await search.fill('inexistente')
      await expect(page.getByRole('status')).toHaveText(
        'No se encontraron usuarios para “inexistente”.',
      )
      await expect(table).toHaveCount(0)
      const clear = page.getByRole('button', { name: 'Limpiar búsqueda' })
      await clear.focus()
      await page.keyboard.press('Enter')
      await expect(search).toHaveValue('')
      await expect(table.getByRole('row')).toHaveCount((await fixture.prisma.user.count()) + 1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      const scrollRegion = page.getByRole('region', {
        name: 'Tabla de usuarios y roles',
        exact: true,
      })
      await scrollRegion.focus()
      await expect(scrollRegion).toBeFocused()
      await scrollRegion.evaluate((element) => {
        element.scrollLeft = element.scrollWidth
      })
      await expect(
        table.getByRole('columnheader', { name: 'Persona administradora' }),
      ).toBeInViewport()
      const accessibility = await new AxeBuilder({ page })
        .include('main')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(accessibility.violations).toEqual([])
    } finally {
      await fixture.cleanup()
    }
  })
}
