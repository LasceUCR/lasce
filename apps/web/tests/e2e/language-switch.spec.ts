import { expect, test } from '@playwright/test'

// Wide enough for the desktop header: at 1400px and below the navigation is the mobile menu.
test.use({ viewport: { width: 1600, height: 900 } })

test('renders in Spanish until the visitor chooses another language', async ({ page }) => {
  await page.goto('/contacto')

  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await expect(page.getByRole('banner').getByLabel('Idioma: Español')).toHaveText('ES')
})

test('switches the site shell to English, remembers the choice and switches back', async ({
  page,
}) => {
  await page.goto('/contacto')

  await page.getByRole('banner').getByLabel('Idioma: Español').click()
  await page.getByRole('banner').getByRole('button', { name: 'English' }).click()

  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Contact' })).toHaveAttribute(
    'href',
    '/contacto',
  )
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached()
  await expect(page.getByRole('contentinfo').getByText(/All rights reserved\./)).toBeVisible()
  // The language is not part of the URL.
  await expect(page).toHaveURL(/\/contacto$/)
  // Copy that has not been moved to the message catalogues yet stays in Spanish.
  await expect(page.getByRole('heading', { level: 1, name: 'Contacto' })).toBeVisible()

  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()

  await page.goto('/')

  await expect(page).toHaveTitle('LASCE | University of Costa Rica')

  await page.getByRole('banner').getByLabel('Language: English').click()
  await page.getByRole('banner').getByRole('button', { name: 'Español' }).click()

  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page).toHaveTitle('LASCE | Universidad de Costa Rica')
})

test('falls back to Spanish when the language cookie holds an unsupported value', async ({
  context,
  page,
}) => {
  await context.addCookies([{ name: 'lasce_locale', value: 'xx', url: 'http://localhost:3000' }])

  const response = await page.goto('/contacto')

  expect(response?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
})
