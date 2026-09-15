import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createAdminFixture } from './helpers/admin-users'

test('supports narrow screens, long names, keyboard recovery and conflicting changes', async ({
  page,
  context,
}) => {
  const fixture = await createAdminFixture(context)
  try {
    const name = 'Usuario ' + 'A'.repeat(110)
    await fixture.prisma.user.update({ where: { id: fixture.target.id }, data: { fullName: name } })
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/administracion/usuarios')
    const search = page.getByRole('searchbox', { name: 'Buscar usuarios' })
    await search.fill(fixture.target.email)
    await expect(page.getByRole('status')).toContainText('1 usuario encontrado')
    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
    await expect(search).toBeFocused()
    const row = page.getByRole('row', { name: new RegExp(fixture.target.email) })
    await row.getByRole('button', { name, exact: true }).click()
    let dialog = page.getByRole('dialog')
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    const checkbox = row.getByRole('checkbox', { name: /^Asistente:/ })
    await checkbox.focus()
    await page.keyboard.press('Space')
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'No, cancelar' })).toBeFocused()
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await fixture.prisma.user.update({ where: { id: fixture.target.id }, data: { role: 'ADMIN' } })
    await dialog.getByRole('button', { name: 'Sí, cambiar rol' }).click()
    await expect(dialog.getByRole('alert')).toContainText('La información de este usuario cambió')
    await expect(dialog.getByRole('alert')).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Sí, cambiar rol' })).toBeDisabled()
    expect(
      (
        await new AxeBuilder({ page })
          .include('dialog')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await dialog.getByRole('button', { name: 'Recargar página' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(row.getByRole('checkbox', { name: /^Persona administradora:/ })).toBeChecked()
    await page
      .getByRole('row', { name: new RegExp(fixture.admin.email) })
      .getByRole('checkbox', { name: /^Persona administradora:/ })
      .click()
    await expect(page.getByRole('dialog').getByText(/perderás el acceso/)).toBeVisible()
    await page.setViewportSize({ width: 640, height: 360 })
    await page.getByRole('button', { name: 'No, cancelar' }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .include('main')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  } finally {
    await fixture.cleanup()
  }
})
