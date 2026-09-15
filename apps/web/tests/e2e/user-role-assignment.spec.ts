import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createAdminFixture } from './helpers/admin-users'

for (const width of [390, 1440]) {
  test(`persists confirmed assignments and removals at ${width}px`, async ({ page, context }) => {
    const fixture = await createAdminFixture(context)
    try {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/administracion/usuarios')
      await page.getByRole('searchbox', { name: 'Buscar usuarios' }).fill(fixture.target.email)
      const row = page.getByRole('row', { name: new RegExp(fixture.target.email) })
      const assistant = row.getByRole('checkbox', { name: /^Asistente:/ })
      const visitor = row.getByRole('checkbox', { name: /^Visitante:/ })
      await expect(visitor).toBeChecked()
      await assistant.focus()
      await page.keyboard.press('Space')
      const dialog = page.getByRole('dialog', { name: 'Confirmar cambio de rol' })
      await expect(dialog.getByRole('button', { name: 'No, cancelar' })).toBeFocused()
      expect(
        (
          await new AxeBuilder({ page })
            .include('dialog')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([])
      await page.keyboard.press('Escape')
      await expect(assistant).toBeFocused()
      await expect(visitor).toBeChecked()
      await assistant.click()
      await dialog.getByRole('button', { name: 'Sí, cambiar rol' }).click()
      await expect(assistant).toBeChecked()
      await page.reload()
      await expect(assistant).toBeChecked()
      expect(
        (await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.target.id } })).role,
      ).toBe('ASSISTANT')
      await assistant.click()
      await page.getByRole('button', { name: 'Sí, retirar rol' }).click()
      await expect(assistant).not.toBeChecked()
      await page.reload()
      await expect(assistant).not.toBeChecked()
      expect(
        (await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.target.id } })).role,
      ).toBeNull()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      // Revocation is effective even when an old page still has editable controls.
      await fixture.prisma.user.update({
        where: { id: fixture.admin.id },
        data: { role: 'VISITOR' },
      })
      await visitor.click()
      await page.getByRole('button', { name: 'Sí, cambiar rol' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      expect(
        (await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.target.id } })).role,
      ).toBeNull()
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
      await expect(page.getByRole('table')).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
}

test('requires authentication before returning user information', async ({ page }) => {
  await page.goto('/administracion/usuarios')
  await expect(page).toHaveURL(/acceso\?next=%2Fadministracion%2Fusuarios&reason=auth/)
  await expect(page.getByRole('table')).toHaveCount(0)
})
