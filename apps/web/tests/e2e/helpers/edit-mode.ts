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
  // Filter before `first()`: on a narrow viewport the hidden desktop account menu comes first in
  // the DOM, and `first()` alone would pin it and wait for it to become visible forever.
  const trigger = account.or(mobileMenu).filter({ visible: true }).first()
  await trigger.waitFor({ state: 'visible' })
  await trigger.click()
  await page.getByRole('switch', { name: /^(Modo edición|Edit mode)$/ }).click()
}
