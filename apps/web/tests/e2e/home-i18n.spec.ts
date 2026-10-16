import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

// Wide enough for the desktop header, where the language menu lives above 1400px.
test.use({ viewport: { width: 1600, height: 900 } })

/**
 * The home page's CMS: the banner and the geomagnetic indices, edited in both languages and
 * reordered by dragging. They are seeded by their migration and cannot be created or deleted, so
 * each test edits the seeded rows and writes them back afterwards. The banner's title is never
 * changed: other specs find the home page by it.
 */

async function snapshot() {
  const { prisma } = await import('@lasce/db')
  const [hero, indices] = await Promise.all([
    prisma.homeHero.findFirstOrThrow({
      orderBy: { createdAt: 'asc' },
      include: { translations: true },
    }),
    prisma.geomagneticIndex.findMany({ include: { translations: true } }),
  ])

  return async function restore() {
    await prisma.$transaction(async (tx) => {
      await tx.homeHero.update({
        where: { id: hero.id },
        data: { title: hero.title, lead: hero.lead, updatedAt: hero.updatedAt },
      })
      for (const { locale, title, lead } of hero.translations) {
        await tx.homeHeroTranslation.upsert({
          where: { homeHeroId_locale: { homeHeroId: hero.id, locale } },
          create: { homeHeroId: hero.id, locale, title, lead },
          update: { title, lead },
        })
      }
      // Positions are unique: move every index aside first, so restoring one never takes the
      // position another still holds.
      for (const [aside, index] of indices.entries()) {
        await tx.geomagneticIndex.update({
          where: { id: index.id },
          data: { position: -(aside + 1) },
        })
      }
      for (const index of indices) {
        await tx.geomagneticIndex.update({
          where: { id: index.id },
          data: {
            value: index.value,
            description: index.description,
            position: index.position,
            source: index.source,
            observedAt: index.observedAt,
            updatedAt: index.updatedAt,
          },
        })
        for (const { locale, description } of index.translations) {
          await tx.geomagneticIndexTranslation.upsert({
            where: { geomagneticIndexId_locale: { geomagneticIndexId: index.id, locale } },
            create: { geomagneticIndexId: index.id, locale, description },
            update: { description },
          })
        }
      }
    })
  }
}

/** The header's language menu is labelled in the current language: "Idioma" or "Language". */
const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

async function openEditMode(page: Page) {
  await page.goto('/administracion')
  await page.getByRole('switch', { name: 'Modo edición' }).click()
  await page.goto('/')
}

function indicators(page: Page) {
  return page.getByRole('region', { name: /Índices geomagnéticos|Geomagnetic indices/ })
}

async function cardOrder(page: Page) {
  return indicators(page).getByRole('article').locator('p').allTextContents()
}

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])

let restore: () => Promise<void>

test.beforeEach(async () => {
  restore = await snapshot()
})

test.afterEach(async () => {
  await restore()
})

test('shows the stored banner and indices in the language chosen in the header', async ({
  page,
}) => {
  await page.goto('/')

  const heading = page.getByRole('heading', {
    level: 1,
    name: 'Exploramos el Sol para comprender el clima espacial',
  })
  await expect(heading).toHaveAttribute('lang', 'es')
  await expect(indicators(page).getByRole('article').nth(1)).toHaveText(/-12 nT · Estable/)
  // A visitor gets no editing controls, even with edit mode left on in this browser.
  await expect(indicators(page).getByRole('button')).toHaveCount(0)

  await switchLanguage(page, 'Español', 'English')
  await expect(
    page.getByRole('heading', { level: 1, name: 'We explore the Sun to understand space weather' }),
  ).toHaveAttribute('lang', 'en')
  await expect(indicators(page).getByRole('article').nth(1)).toHaveText(/-12 nT · Stable/)

  await page.reload()
  await expect(indicators(page).getByText('Stable')).toHaveAttribute('lang', 'en')
})

test('edits an index in both languages and caps its text at 15 characters', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await expect(page.getByRole('button', { name: /^Eliminar/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Editar Índice Dst' }).click()

    const dialog = page.getByRole('dialog', { name: 'Editar Índice Dst' })
    const value = dialog.getByRole('textbox', { name: /^Valor/ })
    await value.fill('')
    await value.pressSequentially('1234567890123456')
    await expect(value).toHaveValue('123456789012345')
    await value.fill('-45 nT')

    await dialog.getByRole('textbox', { name: /^Descripción \(Español\)/ }).fill('Perturbado')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    // Changed in Spanish only: the English description must be updated or confirmed.
    await expect(dialog.getByRole('tab', { name: /^English · 1 por revisar$/ })).toBeVisible()
    await dialog.getByRole('textbox', { name: /^Descripción \(English\)/ }).fill('Disturbed')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Índice geomagnético actualizado correctamente.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(indicators(page).getByRole('article').nth(1)).toHaveText(/-45 nT · Perturbado/)

    await switchLanguage(page, 'Español', 'English')
    await expect(indicators(page).getByRole('article').nth(1)).toHaveText(/-45 nT · Disturbed/)
  } finally {
    await account.cleanup()
  }
})

test('reorders the indices with the keyboard and saves the order on drop', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    expect(await cardOrder(page)).toEqual(['Índice Kp', 'Índice Dst', 'Índice AE', 'Índice Ap'])

    // Pick up, move one place, drop. Each step waits for its announcement, as a screen reader
    // user hears it.
    const status = indicators(page).getByRole('status')
    await page.getByRole('button', { name: 'Reordenar Índice Kp' }).focus()
    await page.keyboard.press('Space')
    await expect(status).toHaveText('Se tomó Índice Kp.')
    // dnd-kit starts listening for the arrow keys a moment after the pick-up, so a key pressed
    // within that moment is ignored, as it would be for a person; press again until it moves.
    await expect(async () => {
      if ((await status.textContent()) === 'Se tomó Índice Kp.') {
        await page.keyboard.press('ArrowRight')
      }
      await expect(status).toHaveText('Índice Kp está sobre la posición de Índice Dst.', {
        timeout: 1_000,
      })
    }).toPass()
    await page.keyboard.press('Space')

    await expect(page.getByText('Orden de los índices actualizado correctamente.')).toBeVisible()
    await page.reload()
    await expect
      .poll(() => cardOrder(page))
      .toEqual(['Índice Dst', 'Índice Kp', 'Índice AE', 'Índice Ap'])
  } finally {
    await account.cleanup()
  }
})

test('reorders the indices by dragging a handle and saves the order on drop', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)

    // Drag Ap onto the first card.
    const handle = page.getByRole('button', { name: 'Reordenar Índice Ap' })
    const target = indicators(page).getByRole('article').first()
    const from = await handle.boundingBox()
    const to = await target.boundingBox()
    if (!from || !to) throw new Error('Expected the cards on screen')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + 20, to.y + to.height / 2, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByText('Orden de los índices actualizado correctamente.')).toBeVisible()
    await page.reload()
    await expect
      .poll(() => cardOrder(page))
      .toEqual(['Índice Ap', 'Índice Kp', 'Índice Dst', 'Índice AE'])
  } finally {
    await account.cleanup()
  }
})

test('edits the banner subtitle in both languages', async ({ page, context }) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: 'Editar portada' }).click()

    const dialog = page.getByRole('dialog', { name: 'Editar portada' })
    await dialog.getByRole('textbox', { name: /^Subtítulo \(Español\)/ }).fill('Subtítulo E2E.')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await dialog.getByRole('textbox', { name: /^Subtítulo \(English\)/ }).fill('E2E subtitle.')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Portada actualizada correctamente.')).toBeVisible()
    await expect(page.getByText('Subtítulo E2E.')).toHaveAttribute('lang', 'es')
    await switchLanguage(page, 'Español', 'English')
    await expect(page.getByText('E2E subtitle.')).toHaveAttribute('lang', 'en')
  } finally {
    await account.cleanup()
  }
})

test('meets WCAG A and AA automated checks in edit mode and in the editors, in both languages', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    expect((await axe(page).include('#datos').analyze()).violations).toEqual([])

    await page.getByRole('button', { name: 'Editar portada' }).click()
    const hero = page.getByRole('dialog', { name: 'Editar portada' })
    await hero.getByRole('textbox', { name: /^Título \(Español\)/ }).fill('')
    await hero.getByRole('button', { name: 'Confirmar' }).click()
    await expect(hero.getByText('El título en español es obligatorio.')).toBeVisible()
    expect((await axe(page).include('dialog[open]').analyze()).violations).toEqual([])
    await hero.getByRole('button', { name: 'Cancelar' }).click()
    await page
      .getByRole('dialog', { name: 'Descartar cambios no guardados' })
      .getByRole('button', { name: 'Descartar' })
      .click()

    await switchLanguage(page, 'Español', 'English')
    await page.getByRole('button', { name: 'Edit Kp index' }).click()
    const index = page.getByRole('dialog', { name: 'Edit Kp index' })
    await index.getByRole('textbox', { name: /^Description \(Español\)/ }).fill('Activo')
    await index.getByRole('button', { name: 'Confirm' }).click()
    await expect(
      index.getByRole('switch', { name: 'The English description is still correct' }),
    ).toBeVisible()
    expect((await axe(page).include('dialog[open]').analyze()).violations).toEqual([])
  } finally {
    await account.cleanup()
  }
})

test('keeps the edit controls and the editors inside the viewport from phones to desktops', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const handle = page.getByRole('button', { name: 'Reordenar Índice Ap' })
      await handle.scrollIntoViewIfNeeded()
      const handleBox = await handle.boundingBox()
      expect(
        handleBox && handleBox.x >= 0 && handleBox.x + handleBox.width <= width,
        `handle at ${width}px`,
      ).toBe(true)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        `page at ${width}px`,
      ).toBe(false)

      await page.getByRole('button', { name: 'Editar Índice Ap' }).click()
      const dialog = page.getByRole('dialog', { name: 'Editar Índice Ap' })
      const box = await dialog.boundingBox()
      expect(box && box.x >= 0 && box.x + box.width <= width, `editor at ${width}px`).toBe(true)
      await dialog.getByRole('button', { name: 'Cancelar' }).click()
      await expect(dialog).toBeHidden()
    }
  } finally {
    await account.cleanup()
  }
})
