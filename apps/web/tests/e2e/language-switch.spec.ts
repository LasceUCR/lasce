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
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible()

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

// The pages whose copy is in the message catalogues. The rest of the site still shows Spanish
// under English (see docs/internationalization.md, "Translation status").
const translatedPages = [
  {
    path: '/',
    heading: 'We explore the Sun to understand space weather',
    title: /University of Costa Rica/,
  },
  { path: '/contacto', heading: 'Contact', title: 'Contact | LASCE' },
  { path: '/fisica-solar', heading: 'Solar astrophysics', title: 'Solar astrophysics | LASCE' },
  { path: '/clima-espacial', heading: 'Space weather', title: 'Space weather | LASCE' },
  {
    path: '/herramientas-cientificas',
    heading: 'Scientific tools',
    title: 'Scientific tools | LASCE',
  },
  {
    path: '/colaboraciones-e-iniciativas',
    heading: 'Collaborations and Initiatives',
    title: 'Collaborations and Initiatives | LASCE',
  },
]

for (const { path, heading, title } of translatedPages) {
  test(`shows ${path} in English once English is chosen`, async ({ context, page }) => {
    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])

    const response = await page.goto(path)

    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page).toHaveTitle(title)
  })
}

test('shows an academic activity in English and keeps the official event title', async ({
  context,
  page,
}) => {
  await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])

  await page.goto('/noticias/actividades/machine-learning-workshop')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'General information' })).toBeVisible()
  await expect(page.getByText('16-20 February 2026')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to news' })).toHaveAttribute(
    'href',
    '/noticias',
  )
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
