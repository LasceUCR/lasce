import { expect, test } from '@playwright/test'

test('displays official contact information without authentication', async ({ page }) => {
  const response = await page.goto('/contacto')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/contacto')
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)

  const contact = page.getByRole('region', { name: 'Información de contacto' })

  await expect(page.getByRole('heading', { level: 1, name: 'Contacto' })).toBeVisible()
  await expect(contact.getByRole('heading', { name: 'Información de contacto' })).toBeVisible()
  await expect(contact.getByRole('link', { name: '2511-6566' })).toHaveAttribute(
    'href',
    'tel:+50625116566',
  )
  await expect(
    contact.getByText('Universidad de Costa Rica, Sede Rodrigo Facio Brenes'),
  ).toBeVisible()
  await expect(contact.getByText('Montes de Oca, San José, Costa Rica')).toBeVisible()
  await expect(contact.getByText(/código postal/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute(
    'href',
    'https://www.instagram.com/lasce_ucr/',
  )
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByText(/por definir|próximamente|ejemplo@/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /canales oficiales/i,
  )
})
