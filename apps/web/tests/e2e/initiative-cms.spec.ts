import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createSignedInUser } from './helpers/admin-users'

test.use({ viewport: { width: 1440, height: 1000 } })

test('creates, reviews, updates and deletes bilingual initiatives with persistent feedback and responsive forms', async ({
  page,
  context,
}, testInfo) => {
  const account = await createSignedInUser(context, 'ADMIN')
  const title = `Initiative ${randomUUID()}`
  try {
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/colaboraciones-e-iniciativas')
    await page.getByRole('button', { name: 'Añadir iniciativa' }).click()
    const dialog = page.getByRole('dialog', { name: 'Añadir iniciativa' })
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('textbox', { name: /Título \(Español\)/ })).toBeFocused()
    await dialog.getByRole('textbox', { name: /Título \(Español\)/ }).fill(title)
    await dialog
      .getByRole('textbox', { name: /Descripción \(Español\)/ })
      .fill('Descripción de la iniciativa.')
    await dialog.getByRole('tab', { name: /English/ }).click()
    await dialog.getByRole('textbox', { name: /Título \(English\)/ }).fill(title)
    await dialog
      .getByRole('textbox', { name: /Descripción \(English\)/ })
      .fill('Initiative description.')
    await dialog.getByRole('textbox', { name: /Sitio web oficial/ }).fill('javascript:alert(1)')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('textbox', { name: /Sitio web oficial/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await dialog.getByRole('textbox', { name: /Sitio web oficial/ }).fill('https://example.com')
    await dialog.getByRole('textbox', { name: /URL del logo/ }).fill('/brand/logo-ISWI.png')
    expect(
      (
        await new AxeBuilder({ page })
          .include('dialog[open]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([])

    await page.route(
      '**/api/initiatives',
      async (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'No se pudo conectar con la base de datos.' }),
        }),
      { times: 1 },
    )
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByText('No se pudo conectar con la base de datos.')).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: /Título \(English\)/ })).toHaveValue(title)
    expect(await account.prisma.initiative.count({ where: { title } })).toBe(0)
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Iniciativa agregada correctamente.')).toBeVisible()
    await expect(dialog).not.toBeVisible()
    const card = page.getByRole('article', { name: title, exact: true })
    await expect(card.getByRole('link', { name: 'Sitio web oficial' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    await expect(card.getByRole('img')).toHaveAttribute('src', /\/brand\/logo-ISWI\.png$/)
    await page.reload()
    await expect(card.getByText('Descripción de la iniciativa.')).toBeVisible()

    await page.getByRole('button', { name: `Editar iniciativa ${title}`, exact: true }).click()
    const edit = page.getByRole('dialog', { name: 'Editar iniciativa' })
    await edit
      .getByRole('textbox', { name: /Descripción \(Español\)/ })
      .fill('Descripción revisada.')
    await edit.getByRole('button', { name: 'Confirmar' }).click()
    await expect(edit.getByRole('tab', { name: /English/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await edit.getByRole('switch').check()
    await edit.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Iniciativa actualizada correctamente.')).toBeVisible()
    await expect(card.getByText('Descripción revisada.')).toBeVisible()

    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(card.getByText('Initiative description.')).toBeVisible()
    await page.getByRole('button', { name: `Edit initiative ${title}`, exact: true }).click()
    const mobile = page.getByRole('dialog', { name: 'Edit initiative' })
    await expect(mobile.getByRole('tab', { name: /Español/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect((await mobile.boundingBox())!.width).toBeLessThanOrEqual(390)
    await mobile.getByRole('textbox', { name: 'Logo URL (optional)' }).fill('')
    await mobile.getByRole('textbox', { name: 'Official website (optional)' }).fill('')
    await page.screenshot({ path: testInfo.outputPath('initiative-editor-mobile.png') })
    await mobile.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('Initiative updated successfully.')).toBeVisible()
    await expect(card.getByRole('link')).toHaveCount(0)
    await expect(card.getByRole('img')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: `Delete initiative ${title}`, exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Delete initiative' })
      .getByRole('button', { name: 'Cancel' })
      .click()
    await expect(card).toBeVisible()
    await page.getByRole('button', { name: `Delete initiative ${title}`, exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Delete initiative' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect(page.getByText('Initiative deleted successfully.')).toBeVisible()
    await expect(card).toHaveCount(0)
  } finally {
    await account.prisma.initiative.deleteMany({ where: { title } })
    await account.cleanup()
  }
})

test('enforces independent write permissions and keeps public reads free of editing data', async ({
  page,
  context,
  request,
}) => {
  const id = randomUUID()
  const publicRead = await request.get('/api/initiatives')
  expect(publicRead.status()).toBe(200)
  const records = (await publicRead.json()).initiatives
  expect(records.length).toBeGreaterThanOrEqual(2)
  expect(records.every((record: object) => !('editing' in record))).toBe(true)
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    expect(
      (
        await request.fetch(`/api/initiatives${method === 'POST' ? '' : `/${id}`}`, {
          method,
          data: {},
        })
      ).status(),
    ).toBe(401)
  }
  const account = await createSignedInUser(context, 'ASSISTANT')
  try {
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/colaboraciones-e-iniciativas')
    await expect(page.getByRole('button', { name: 'Añadir iniciativa' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Eliminar iniciativa / })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Editar iniciativa / }).first()).toBeVisible()
    expect((await context.request.post('/api/initiatives', { data: {} })).status()).toBe(403)
    expect((await context.request.delete(`/api/initiatives/${id}`)).status()).toBe(403)
    expect((await context.request.patch(`/api/initiatives/${id}`, { data: {} })).status()).toBe(400)
    await account.prisma.user.update({ where: { id: account.user.id }, data: { role: 'VISITOR' } })
    await page.reload()
    await expect(page.getByRole('button', { name: /^Editar iniciativa / })).toHaveCount(0)
    expect((await context.request.patch(`/api/initiatives/${id}`, { data: {} })).status()).toBe(403)
  } finally {
    await account.cleanup()
  }
})

test('rejects invalid data, missing reviews and stale saves at the API boundary', async ({
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  let id: string | undefined
  const content = {
    es: { title: `API ${randomUUID()}`, description: 'Descripción' },
    en: { title: 'API initiative', description: 'Description' },
  }
  try {
    expect(
      (
        await context.request.post('/api/initiatives', { data: { content: { es: content.es } } })
      ).status(),
    ).toBe(400)
    expect(
      (
        await context.request.post('/api/initiatives', {
          data: { content, websiteUrl: 'javascript:alert(1)' },
        })
      ).status(),
    ).toBe(400)
    expect(
      (
        await context.request.post('/api/initiatives', {
          data: '{',
          headers: { 'Content-Type': 'application/json' },
        })
      ).status(),
    ).toBe(400)
    expect(
      (await context.request.patch('/api/initiatives/not-a-uuid', { data: {} })).status(),
    ).toBe(400)
    const response = await context.request.post('/api/initiatives', { data: { content } })
    expect(response.status()).toBe(201)
    id = (await response.json()).initiative.id
    const record = await account.prisma.initiative.findUniqueOrThrow({ where: { id } })
    const version = record.updatedAt.toISOString()
    const next = { ...content, es: { ...content.es, title: content.es.title + ' updated' } }
    const review = await context.request.patch(`/api/initiatives/${id}`, {
      data: { version, content: next },
    })
    expect(review.status()).toBe(400)
    expect((await review.json()).code).toBe('review-required')
    expect((await account.prisma.initiative.findUniqueOrThrow({ where: { id } })).title).toBe(
      content.es.title,
    )
    expect(
      (
        await context.request.patch(`/api/initiatives/${id}`, {
          data: { version, content: next, confirmedUnchanged: [{ locale: 'en', field: 'title' }] },
        })
      ).status(),
    ).toBe(200)
    expect(
      (
        await context.request.patch(`/api/initiatives/${id}`, {
          data: { version, websiteUrl: 'https://example.com/stale' },
        })
      ).status(),
    ).toBe(409)
    expect(
      (await account.prisma.initiative.findUniqueOrThrow({ where: { id } })).websiteUrl,
    ).toBeNull()
    expect((await context.request.delete(`/api/initiatives/${id}`)).status()).toBe(204)
    expect(await account.prisma.initiativeTranslation.count({ where: { initiativeId: id } })).toBe(
      0,
    )
    expect((await context.request.delete(`/api/initiatives/${id}`)).status()).toBe(404)
  } finally {
    if (id) await account.prisma.initiative.deleteMany({ where: { id } })
    await account.cleanup()
  }
})
