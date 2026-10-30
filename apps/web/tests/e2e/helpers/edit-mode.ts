import type { Page } from '@playwright/test'

/**
 * Turns "Modo edición" on from the account menu, which is where the switch lives. The switch is
 * named "Modo edición" in Spanish and "Edit mode" in English. On a narrow viewport the desktop
 * account menu is hidden, so it goes through the mobile menu instead. The choice survives
 * navigation.
 */
export async function enableEditMode(page: Page): Promise<void> {
  const account = page.locator('details.account-menu > summary')
  const mobileMenu = page.getByLabel(/^(Abrir navegación|Open navigation)$/)
  // The header shows the account only after hydration, so wait for whichever trigger is on screen.
  await account.or(mobileMenu).first().waitFor({ state: 'visible' })
  await ((await account.isVisible()) ? account : mobileMenu).click()
  await page.getByRole('switch', { name: /^(Modo edición|Edit mode)$/ }).click()
}
