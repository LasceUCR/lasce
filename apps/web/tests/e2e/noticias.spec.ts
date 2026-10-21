import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

// Runs against the seeded news (`pnpm db:seed`, which CI runs before this suite).

function newsList(page: Page) {
  return page.getByRole('region', { name: 'Noticias recientes' })
}

test('lists news as compact, text-only cards that open the source article', async ({ page }) => {
  await page.goto('/noticias')

  const cards = newsList(page).getByRole('article')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(0)

  await expect(newsList(page).locator('img')).toHaveCount(0)

  const first = cards.first()
  await expect(first.getByRole('heading', { level: 3 })).toBeVisible()
  const link = first.getByRole('link', {
    name: /^Abrir fuente de «.+» \(se abre en una pestaña nueva\)$/,
  })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('href', /^https?:\/\//)
})

test('keeps news in chronological order, newest first and undated last', async ({ page }) => {
  await page.goto('/noticias')

  const cards = newsList(page).getByRole('article')
  await expect(cards.first()).toBeVisible()
  const dates = await cards.evaluateAll((articles) =>
    articles.map((article) => article.querySelector('time')?.getAttribute('datetime') ?? null),
  )

  const dated = dates.filter((date): date is string => date !== null)
  expect(dated).toEqual([...dated].sort().reverse())
  // Every undated item comes after the last dated one.
  const firstUndated = dates.indexOf(null)
  if (firstUndated !== -1) {
    expect(dates.slice(firstUndated).every((date) => date === null)).toBe(true)
  }
})

test('fits the news cards to the screen at every width without sideways scrolling', async ({
  page,
}) => {
  await page.goto('/noticias')
  await expect(newsList(page).getByRole('article').first()).toBeVisible()

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })

    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      const list = document.querySelector('.news-list')
      const listRight = list?.getBoundingClientRect().right ?? Infinity
      return (
        root.scrollWidth > root.clientWidth ||
        Array.from(document.querySelectorAll('.news-list article')).some(
          (card) => card.getBoundingClientRect().right > listRight + 0.5,
        )
      )
    })

    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
  }
})

test("lets visitors expand and collapse a news item's summary inline with Leer más", async ({
  page,
}) => {
  await page.goto('/noticias')

  const cards = newsList(page).getByRole('article')
  await expect(cards.first()).toBeVisible()

  // Seeded news items have lengthened summaries, offering "Leer más"
  const readMoreToggle = newsList(page).getByRole('button', { name: 'Leer más' }).first()
  await expect(readMoreToggle).toBeVisible()
  await expect(readMoreToggle).toHaveAttribute('aria-expanded', 'false')

  await readMoreToggle.click()

  const readLessToggle = newsList(page).getByRole('button', { name: 'Leer menos' }).first()
  await expect(readLessToggle).toBeVisible()
  await expect(readLessToggle).toHaveAttribute('aria-expanded', 'true')

  await readLessToggle.click()
  await expect(newsList(page).getByRole('button', { name: 'Leer más' }).first()).toBeVisible()
})

test('returns a 404 page when navigating to a non-existent news article', async ({ page }) => {
  const response = await page.goto('/noticias/00000000-0000-0000-0000-000000000000')
  expect(response?.status()).toBe(404)
})

test('does not show administrative controls to unauthenticated visitors', async ({ page }) => {
  await page.goto('/noticias')
  await expect(page.getByRole('button', { name: 'Agregar noticia' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
})

test('allows an admin to create, view, edit, and delete a news article', async ({
  page,
  context,
}) => {
  const fixture = await createSignedInUser(context, 'ADMIN')
  const uniqueTitle = `Noticia de prueba E2E ${Date.now()}`
  const updatedTitle = `${uniqueTitle} (Editada)`
  const englishTitle = `E2E test news item ${Date.now()}`
  const uniqueUrl = `https://e2e.example.com/noticia-${Date.now()}`

  try {
    await page.goto('/administracion')
    await page.getByRole('switch', { name: 'Modo edición' }).click()
    await page.goto('/noticias')

    // 1. Validation test on creation
    await page.getByRole('button', { name: 'Agregar noticia' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Agregar noticia' })
    await expect(addDialog).toBeVisible()

    await addDialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(addDialog.getByText('El título en español es obligatorio.')).toBeVisible()

    // 2. Fill the required fields, the title and abstract in both languages, and save
    await addDialog.getByRole('textbox', { name: /^Título \(Español\)/ }).fill(uniqueTitle)
    await addDialog
      .getByRole('textbox', { name: /^Resumen \(Español\)/ })
      .fill('Resumen detallado de la noticia de prueba E2E.')
    await addDialog.getByRole('tab', { name: /^English/ }).click()
    await addDialog.getByRole('textbox', { name: /^Título \(English\)/ }).fill(englishTitle)
    await addDialog
      .getByRole('textbox', { name: /^Resumen \(English\)/ })
      .fill('Detailed abstract of the E2E test news item.')
    await addDialog.getByRole('textbox', { name: /^Autores/ }).fill('Reportero E2E')
    await addDialog.getByRole('textbox', { name: /^Fuente/ }).fill('Periódico E2E')
    await addDialog.getByRole('textbox', { name: /^Enlace/ }).fill(uniqueUrl)
    await addDialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Noticia agregada correctamente.')).toBeVisible()
    await expect(addDialog).toBeHidden()

    // 3. Newly created article is in list and displays its content
    const createdCard = newsList(page).getByRole('article').filter({ hasText: uniqueTitle })
    await expect(createdCard).toBeVisible()
    await expect(createdCard.getByText('Reportero E2E')).toBeVisible()
    await expect(createdCard.getByText('Periódico E2E')).toBeVisible()
    await expect(
      createdCard.getByText('Resumen detallado de la noticia de prueba E2E.'),
    ).toBeVisible()
    const sourceLink = createdCard.getByRole('link', {
      name: new RegExp(`^Abrir fuente de «${uniqueTitle}»`),
    })
    await expect(sourceLink).toHaveAttribute('href', uniqueUrl)

    // 4. Edit the news article
    const itemToEdit = newsList(page).locator('.editable').filter({ hasText: uniqueTitle })
    await itemToEdit.getByRole('button', { name: 'Editar' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Editar noticia' })
    await expect(editDialog).toBeVisible()

    // A title changed in one language must change in the other too, in the same edit.
    await editDialog.getByRole('textbox', { name: /^Título \(Español\)/ }).fill(updatedTitle)
    await editDialog.getByRole('tab', { name: /^English/ }).click()
    await editDialog
      .getByRole('textbox', { name: /^Título \(English\)/ })
      .fill(`${englishTitle} (Edited)`)
    await editDialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Noticia actualizada correctamente.')).toBeVisible()
    await expect(editDialog).toBeHidden()

    const editedItem = newsList(page).locator('.editable').filter({ hasText: updatedTitle })
    await expect(editedItem).toBeVisible()

    // 5. Delete cancellation keeps the article
    await editedItem.getByRole('button', { name: 'Eliminar' }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Eliminar noticia' })
    await expect(deleteDialog).toBeVisible()
    await deleteDialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(deleteDialog).toBeHidden()
    await expect(
      newsList(page).getByRole('article').filter({ hasText: updatedTitle }),
    ).toBeVisible()

    // 6. Delete confirmation deletes the article
    await editedItem.getByRole('button', { name: 'Eliminar' }).click()
    const confirmDeleteDialog = page.getByRole('dialog', { name: 'Eliminar noticia' })
    await expect(confirmDeleteDialog).toBeVisible()
    await confirmDeleteDialog.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText('Noticia eliminada correctamente.')).toBeVisible()
    await expect(confirmDeleteDialog).toBeHidden()
    await expect(newsList(page).getByRole('article').filter({ hasText: updatedTitle })).toHaveCount(
      0,
    )
  } finally {
    // Clean up created news in case test failed before deleting
    await fixture.prisma.news.deleteMany({
      where: {
        OR: [{ title: uniqueTitle }, { title: updatedTitle }, { externalUrl: uniqueUrl }],
      },
    })
    await fixture.cleanup()
  }
})
