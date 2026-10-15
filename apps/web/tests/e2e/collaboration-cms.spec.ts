import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createSignedInUser } from './helpers/admin-users'

test.use({ viewport: { width: 1440, height: 1000 } })

test('manages bilingual collaborations and optional fields through the shared CMS editor', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  const name = `CMS collaboration ${randomUUID()}`
  try {
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/colaboraciones-e-iniciativas')
    await page.getByRole('button', { name: 'Añadir colaboración' }).click()
    const dialog = page.getByRole('dialog', { name: 'Añadir colaboración' })
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('textbox', { name: /Nombre de la organización/ })).toBeFocused()
    await dialog.getByRole('textbox', { name: /Nombre de la organización/ }).fill(name)
    await dialog.getByRole('textbox', { name: /País \(Español\)/ }).fill('Alemania')
    await dialog.getByRole('combobox', { name: /Clasificación/ }).selectOption('international')
    await dialog.getByRole('tab', { name: /English/ }).click()
    await dialog.getByRole('textbox', { name: /País \(English\)/ }).fill('Germany')
    expect(
      (
        await new AxeBuilder({ page })
          .include('dialog[open]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Colaboración agregada correctamente.')).toBeVisible()
    await expect(dialog).not.toBeVisible()
    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .last()
    await expect(card.getByText('Internacional', { exact: true })).toBeVisible()
    await expect(card.getByText('Alemania', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click()
    const edit = page.getByRole('dialog', { name: 'Editar colaboración' })
    await edit.getByRole('textbox', { name: 'Siglas (opcional)' }).fill('CMS')
    await edit.getByRole('textbox', { name: 'Sitio web (opcional)' }).fill('https://example.com')
    await edit.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Colaboración actualizada correctamente.')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Sitio web oficial' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    await page.reload()
    await expect(card.getByText('Siglas: CMS', { exact: true })).toBeVisible()

    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
    await page.reload()
    await expect(card.getByText('Germany', { exact: true })).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click()
    const mobile = page.getByRole('dialog', { name: 'Edit collaboration' })
    await expect(mobile.getByRole('textbox', { name: /Organization name/ })).toHaveValue(name)
    const box = await mobile.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(390)
    await mobile.getByRole('textbox', { name: 'Website (optional)' }).fill('')
    await mobile.getByRole('textbox', { name: 'Acronym (optional)' }).fill('')
    await mobile.getByRole('button', { name: 'Confirm' }).click()
    await expect(mobile).not.toBeVisible()
    await expect(card.getByRole('link')).toHaveCount(0)

    await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Delete collaboration' })
      .getByRole('button', { name: 'Cancel' })
      .click()
    await expect(card).toBeVisible()
    await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Delete collaboration' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect(page.getByText('Collaboration deleted successfully.')).toBeVisible()
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Official IVIA site' })).toBeVisible()
  } finally {
    await account.prisma.collaboration.deleteMany({ where: { name } })
    await account.cleanup()
  }
})

test('denies anonymous and non-editor writes and does not show their management controls', async ({
  page,
  context,
  request,
}) => {
  const id = randomUUID()
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = await request.fetch(
      `/api/collaborations${method === 'POST' ? '' : `/${id}`}`,
      { method, data: {} },
    )
    expect(response.status()).toBe(401)
  }
  const account = await createSignedInUser(context, 'VISITOR')
  try {
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/colaboraciones-e-iniciativas')
    await expect(page.getByRole('button', { name: 'Añadir colaboración' })).toHaveCount(0)
    const section = page.getByRole('region', { name: 'Colaboraciones de investigación' })
    await expect(section.getByRole('button')).toHaveCount(0)
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const response = await context.request.fetch(
        `/api/collaborations${method === 'POST' ? '' : `/${id}`}`,
        { method, data: {} },
      )
      expect(response.status()).toBe(403)
    }
  } finally {
    await account.cleanup()
  }
})
