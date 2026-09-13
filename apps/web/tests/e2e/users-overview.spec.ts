import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`searches users and preserves read-only roles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const response = await page.goto('/administracion/usuarios')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle('Usuarios | Administración | LASCE')
    const table = page.getByRole('table', { name: 'Usuarios y roles' })
    await expect(table.getByRole('row')).toHaveCount(5)
    const search = page.getByRole('searchbox', { name: 'Buscar usuarios' })
    await search.fill(' ANA ')
    await search.press('Enter')
    await expect(table.getByRole('row')).toHaveCount(2)
    const admin = table.getByRole('checkbox', {
      name: 'Administrador: Ana Ejemplo (ana@example.com)',
    })
    await expect(admin).toBeChecked()
    await expect(admin).toBeDisabled()
    const userName = table.getByRole('button', { name: 'Ana Ejemplo' })
    await userName.click()
    const dialog = page.getByRole('dialog', { name: 'Información del usuario' })
    await expect(dialog.getByText('Universidad de Costa Rica', { exact: true })).toBeVisible()
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
    await expect(search).toHaveValue(' ANA ')
    await userName.press('Enter')
    await dialog.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialog).toHaveCount(0)
    await search.fill('carlos@')
    await expect(table.getByRole('row')).toHaveCount(2)
    for (const checkbox of await table.getByRole('checkbox').all()) {
      await expect(checkbox).not.toBeChecked()
      await expect(checkbox).toBeDisabled()
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
    await expect(table.getByRole('row')).toHaveCount(5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const scrollRegion = page.getByRole('region', {
      name: 'Tabla de usuarios y roles',
      exact: true,
    })
    await scrollRegion.focus()
    await expect(scrollRegion).toBeFocused()
    await scrollRegion.evaluate((element) => {
      element.scrollLeft = element.scrollWidth
    })
    await expect(admin).toBeInViewport()
    const accessibility = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations).toEqual([])
  })
}
