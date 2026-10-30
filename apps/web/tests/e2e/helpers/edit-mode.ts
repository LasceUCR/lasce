import type { Page } from '@playwright/test'

/**
 * Turns "Modo edición" on from the account menu of the top bar, which is where the switch lives.
 * Works from any page of a signed-in editor on a desktop viewport; the choice survives navigation.
 */
export async function enableEditMode(page: Page): Promise<void> {
  await page.locator('details.account-menu > summary').click()
  await page.getByRole('switch', { name: 'Modo edición' }).click()
}
