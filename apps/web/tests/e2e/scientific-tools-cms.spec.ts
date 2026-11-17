import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createSignedInUser } from './helpers/admin-users'

test.use({ viewport: { width: 1440, height: 1000 } })

test('adds, edits and removes a scientific tool in both languages with toasts', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  const name = `Tool ${randomUUID().slice(0, 8)}`
  const imageUrl = `/api/scientific-tools/images/${randomUUID()}.webp`
  const imageFile = fileURLToPath(
    new URL('../../public/images/tools/SWAAT-sun.webp', import.meta.url),
  )
  try {
    // CI supplies PostgreSQL and Redis but no MinIO: stub the image service at its HTTP boundary.
    // The tool's create, update and delete requests use the real API and database.
    await page.route('**/api/scientific-tools/images?mode=create', async (route) => {
      expect(route.request().headers()['content-type']).toContain('multipart/form-data;')
      await route.fulfill({ status: 201, json: { imageUrl } })
    })
    await page.route(
      (url) => url.pathname === imageUrl,
      (route) => route.fulfill({ path: imageFile, contentType: 'image/webp' }),
    )
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/herramientas-cientificas')

    await page.getByRole('button', { name: 'Añadir herramienta científica' }).click()
    const dialog = page.getByRole('dialog', { name: 'Añadir herramienta científica' })
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('textbox', { name: /^Nombre/ })).toBeFocused()
    await dialog.getByRole('textbox', { name: /^Nombre/ }).fill(name)
    await dialog
      .getByRole('textbox', { name: /Descripción \(Español\)/ })
      .fill('Descripción de la herramienta.')
    await dialog.getByRole('textbox', { name: /Enlace de acceso/ }).fill('http://example.com')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    // The missing English description moves the editor to that tab and marks it.
    await expect(dialog.getByRole('textbox', { name: /Descripción \(English\)/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await dialog.getByRole('textbox', { name: /Descripción \(English\)/ }).fill('Tool description.')
    await expect(dialog.getByRole('textbox', { name: /Enlace de acceso/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(dialog.getByRole('textbox', { name: /^Nombre/ })).toHaveValue(name)
    await dialog.getByRole('textbox', { name: /Enlace de acceso/ }).fill('https://example.com/tool')
    await dialog.locator('input[type="file"]').setInputFiles(imageFile)
    expect(
      (
        await new AxeBuilder({ page })
          .include('dialog[open]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Herramienta científica agregada correctamente.')).toBeVisible()

    const card = page.getByRole('article', { name, exact: true })
    await expect(card.getByText('Descripción de la herramienta.')).toBeVisible()
    const link = card.getByRole('link', { name: `Acceder a ${name}` })
    await expect(link).toHaveAttribute('href', 'https://example.com/tool')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const saved = await account.prisma.scientificTool.findFirstOrThrow({
      where: { name },
      include: { translations: true },
    })
    expect(saved.imageUrl).toBe(imageUrl)
    expect(saved.translations).toEqual([
      expect.objectContaining({ locale: 'en', description: 'Tool description.' }),
    ])

    await page.getByRole('button', { name: `Editar herramienta ${name}` }).click()
    const edit = page.getByRole('dialog', { name: 'Editar herramienta científica' })
    await edit.getByRole('textbox', { name: /Enlace de acceso/ }).fill('https://example.com/new')
    await edit.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Herramienta científica actualizada correctamente.')).toBeVisible()
    await expect(card.getByRole('link', { name: `Acceder a ${name}` })).toHaveAttribute(
      'href',
      'https://example.com/new',
    )

    await context.addCookies([{ name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' }])
    await page.reload()
    await expect(page.getByRole('article', { name }).getByText('Tool description.')).toBeVisible()
    await context.addCookies([{ name: 'lasce_locale', value: 'es', url: 'http://localhost:3000' }])
    await page.reload()

    await page.getByRole('button', { name: `Eliminar herramienta ${name}` }).click()
    await page
      .getByRole('dialog', { name: 'Eliminar herramienta científica' })
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await expect(page.getByText('Herramienta científica eliminada correctamente.')).toBeVisible()
    await expect(page.getByRole('article', { name })).toHaveCount(0)
    expect(await account.prisma.scientificTool.count({ where: { name } })).toBe(0)
  } finally {
    await account.prisma.scientificTool.deleteMany({ where: { name } })
    await account.cleanup()
  }
})

test('rejects writes from accounts without the grants and stores nothing', async ({
  page,
  context,
  request,
}) => {
  const id = randomUUID()
  const name = `Unauthorized ${randomUUID().slice(0, 8)}`
  const body = {
    name,
    accessUrl: 'https://example.com',
    content: { es: { description: 'Descripción' }, en: { description: 'Description' } },
  }
  const publicRead = await request.get('/api/scientific-tools')
  expect(publicRead.status()).toBe(200)
  const tools = (await publicRead.json()).tools as object[]
  expect(tools.every((tool) => !('editing' in tool))).toBe(true)
  expect((await request.post('/api/scientific-tools', { data: body })).status()).toBe(401)
  expect((await request.patch(`/api/scientific-tools/${id}`, { data: {} })).status()).toBe(401)
  expect((await request.delete(`/api/scientific-tools/${id}`)).status()).toBe(401)

  const account = await createSignedInUser(context, 'VISITOR')
  try {
    await page.addInitScript(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.goto('/herramientas-cientificas')
    await expect(page.getByRole('button', { name: 'Añadir herramienta científica' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Editar herramienta / })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Eliminar herramienta / })).toHaveCount(0)
    expect((await context.request.post('/api/scientific-tools', { data: body })).status()).toBe(403)
    expect(
      (await context.request.patch(`/api/scientific-tools/${id}`, { data: {} })).status(),
    ).toBe(403)
    expect((await context.request.delete(`/api/scientific-tools/${id}`)).status()).toBe(403)
    expect(await account.prisma.scientificTool.count({ where: { name } })).toBe(0)
  } finally {
    await account.cleanup()
  }
})

test('validates fields, translation reviews and stale versions at the API boundary', async ({
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  const name = `API ${randomUUID().slice(0, 8)}`
  const content = { es: { description: 'Descripción' }, en: { description: 'Description' } }
  let id: string | undefined
  try {
    for (const data of [
      { name, accessUrl: 'https://example.com', content: { es: content.es } },
      { name, accessUrl: 'http://example.com', content },
      { name, accessUrl: 'https://user:pass@example.com', content },
      { name: ' ', accessUrl: 'https://example.com', content },
      { name, accessUrl: 'https://example.com', content, imageUrl: 'https://evil.test/x.png' },
    ]) {
      expect((await context.request.post('/api/scientific-tools', { data })).status()).toBe(400)
    }
    expect(await account.prisma.scientificTool.count({ where: { name } })).toBe(0)

    const created = await context.request.post('/api/scientific-tools', {
      data: { name, accessUrl: 'https://example.com', content },
    })
    expect(created.status()).toBe(201)
    id = (await created.json()).tool.id as string
    const version = (
      await account.prisma.scientificTool.findUniqueOrThrow({ where: { id } })
    ).updatedAt.toISOString()
    const next = { ...content, es: { description: 'Descripción nueva' } }
    const review = await context.request.patch(`/api/scientific-tools/${id}`, {
      data: { version, content: next },
    })
    expect(review.status()).toBe(400)
    expect((await review.json()).code).toBe('review-required')
    expect(
      (
        await context.request.patch(`/api/scientific-tools/${id}`, {
          data: {
            version,
            content: next,
            confirmedUnchanged: [{ locale: 'en', field: 'description' }],
          },
        })
      ).status(),
    ).toBe(200)
    expect(
      (
        await context.request.patch(`/api/scientific-tools/${id}`, {
          data: { version, accessUrl: 'https://example.com/stale' },
        })
      ).status(),
    ).toBe(409)
    expect((await context.request.delete(`/api/scientific-tools/${id}`)).status()).toBe(204)
    expect(
      await account.prisma.scientificToolTranslation.count({ where: { scientificToolId: id } }),
    ).toBe(0)
    expect((await context.request.delete(`/api/scientific-tools/${id}`)).status()).toBe(404)
  } finally {
    if (id) await account.prisma.scientificTool.deleteMany({ where: { id } })
    await account.cleanup()
  }
})
