import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

// Wide enough for the desktop header, where the language menu lives above 1400px.
test.use({ viewport: { width: 1600, height: 900 } })

/**
 * The space weather page's CMS (LASCE-CON-012-252): the "¿Por qué estudiarlo desde Costa Rica?"
 * card, edited in both languages in "Modo edición". It is seeded by its migration and cannot be
 * created or deleted, so each test edits the seeded row and writes it back afterwards. The card's
 * title is never changed: other specs find the section by it.
 */

const EDIT_LABEL = 'Editar la sección «¿Por qué estudiarlo desde Costa Rica?»'
const DIALOG_TITLE = 'Editar «¿Por qué estudiarlo desde Costa Rica?»'

async function snapshot() {
  const { prisma } = await import('@lasce/db')
  const section = await prisma.spaceWeatherSection.findUniqueOrThrow({
    where: { key: 'costa-rica' },
    include: { translations: true },
  })

  return async function restore() {
    await prisma.$transaction(async (tx) => {
      await tx.spaceWeatherSection.update({
        where: { id: section.id },
        data: { title: section.title, body: section.body, updatedAt: section.updatedAt },
      })
      for (const { locale, title, body } of section.translations) {
        await tx.spaceWeatherSectionTranslation.upsert({
          where: { sectionId_locale: { sectionId: section.id, locale } },
          create: { sectionId: section.id, locale, title, body },
          update: { title, body },
        })
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
  await page.goto('/clima-espacial')
}

function card(page: Page) {
  return page.getByRole('region', {
    name: /Por qué estudiarlo desde Costa Rica|Why study it from Costa Rica/,
  })
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

test('shows the stored card in the language chosen in the header', async ({ page }) => {
  await page.goto('/clima-espacial')

  await expect(card(page).getByText(/^La respuesta de la ionosfera/)).toHaveAttribute('lang', 'es')
  // A visitor gets no editing controls, even with edit mode left on in this browser.
  await page.evaluate(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
  await page.reload()
  await expect(card(page).getByRole('button')).toHaveCount(0)

  await switchLanguage(page, 'Español', 'English')
  await expect(card(page).getByText(/^The response of the ionosphere/)).toHaveAttribute(
    'lang',
    'en',
  )
})

test('edits the text in both languages and shows it to visitors', async ({ page, context }) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await expect(card(page).getByRole('button', { name: /^Eliminar/ })).toHaveCount(0)
    await page.getByRole('button', { name: EDIT_LABEL }).click()

    const dialog = page.getByRole('dialog', { name: DIALOG_TITLE })
    await expect(dialog.getByRole('textbox', { name: /^Texto \(Español\)/ })).toHaveValue(
      /^La respuesta de la ionosfera/,
    )
    await dialog
      .getByRole('textbox', { name: /^Texto \(Español\)/ })
      .fill('Primer párrafo E2E.\n\nSegundo párrafo E2E.')
    // Changed in Spanish only: the English text must be updated or confirmed before saving.
    await expect(dialog.getByRole('tab', { name: /^English · 1 por revisar$/ })).toBeVisible()
    // "Confirmar" leads to the English tab, where the text is waiting to be updated.
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('tab', { name: /^English/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await dialog.getByRole('textbox', { name: /^Texto \(English\)/ }).fill('E2E paragraph.')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Sección actualizada correctamente.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(card(page).getByText('Primer párrafo E2E.')).toBeVisible()
    await expect(card(page).getByText('Segundo párrafo E2E.')).toBeVisible()

    await switchLanguage(page, 'Español', 'English')
    await expect(card(page).getByText('E2E paragraph.')).toHaveAttribute('lang', 'en')
  } finally {
    await account.cleanup()
  }
})

test('keeps what was typed and the stored text when the input is invalid', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: EDIT_LABEL }).click()

    const dialog = page.getByRole('dialog', { name: DIALOG_TITLE })
    await dialog.getByRole('textbox', { name: /^Título \(Español\)/ }).fill('Título E2E')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await dialog.getByRole('textbox', { name: /^Texto \(English\)/ }).fill('')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(dialog.getByText('El texto en inglés es obligatorio.')).toBeVisible()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('tab', { name: /^Español/ }).click()
    await expect(dialog.getByRole('textbox', { name: /^Título \(Español\)/ })).toHaveValue(
      'Título E2E',
    )

    await page.reload()
    await expect(
      card(page).getByRole('heading', { name: '¿Por qué estudiarlo desde Costa Rica?' }),
    ).toBeVisible()
  } finally {
    await account.cleanup()
  }
})

test('refuses a save over a newer version and leaves the stored text unchanged', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: EDIT_LABEL }).click()

    // Someone else saves after this editor opened.
    await account.prisma.spaceWeatherSection.update({
      where: { key: 'costa-rica' },
      data: { updatedAt: new Date(Date.now() + 60_000) },
    })

    const dialog = page.getByRole('dialog', { name: DIALOG_TITLE })
    await dialog.getByRole('textbox', { name: /^Texto \(Español\)/ }).fill('No debe guardarse.')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await dialog.getByRole('textbox', { name: /^Texto \(English\)/ }).fill('Must not be saved.')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(dialog.getByText(/La sección cambió desde que la abrió/)).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: /^Texto \(English\)/ })).toHaveValue(
      'Must not be saved.',
    )
    const stored = await account.prisma.spaceWeatherSection.findUniqueOrThrow({
      where: { key: 'costa-rica' },
    })
    expect(stored.body).toMatch(/^La respuesta de la ionosfera/)
  } finally {
    await account.cleanup()
  }
})

test('refuses the update to anyone without the edit permission', async ({
  page,
  context,
  playwright,
}) => {
  const body = {
    version: new Date().toISOString(),
    content: { es: { title: 'Título', body: 'Texto.' }, en: { title: 'Title', body: 'Text.' } },
  }

  const anonymous = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  try {
    const response = await anonymous.patch('/api/space-weather/costa-rica', { data: body })
    expect(response.status()).toBe(401)
  } finally {
    await anonymous.dispose()
  }

  const account = await createSignedInUser(context, 'VISITOR')
  try {
    const response = await page.request.patch('/api/space-weather/costa-rica', { data: body })
    expect(response.status()).toBe(403)

    await page.goto('/clima-espacial')
    await page.evaluate(() => localStorage.setItem('lasce:cms-edit-mode', 'true'))
    await page.reload()
    await expect(page.getByRole('button', { name: EDIT_LABEL })).toHaveCount(0)
  } finally {
    await account.cleanup()
  }

  const { prisma } = await import('@lasce/db')
  const stored = await prisma.spaceWeatherSection.findUniqueOrThrow({
    where: { key: 'costa-rica' },
  })
  expect(stored.title).toBe('¿Por qué estudiarlo desde Costa Rica?')
})

test('meets WCAG A and AA automated checks in edit mode and in the editor, in both languages', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    expect((await axe(page).include('main').analyze()).violations).toEqual([])

    await page.getByRole('button', { name: EDIT_LABEL }).click()
    const dialog = page.getByRole('dialog', { name: DIALOG_TITLE })
    await dialog.getByRole('textbox', { name: /^Título \(Español\)/ }).fill('')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByText('El título en español es obligatorio.')).toBeVisible()
    expect((await axe(page).include('dialog[open]').analyze()).violations).toEqual([])
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await page
      .getByRole('dialog', { name: 'Descartar cambios no guardados' })
      .getByRole('button', { name: 'Descartar' })
      .click()

    await switchLanguage(page, 'Español', 'English')
    await page
      .getByRole('button', { name: 'Edit the “Why study it from Costa Rica?” section' })
      .click()
    const english = page.getByRole('dialog', { name: 'Edit “Why study it from Costa Rica?”' })
    await expect(english.getByRole('tablist', { name: 'Content language' })).toBeVisible()
    expect((await axe(page).include('dialog[open]').analyze()).violations).toEqual([])
  } finally {
    await account.cleanup()
  }
})

test('keeps the card, its edit control and the editor inside the viewport from phones to desktops', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const edit = page.getByRole('button', { name: EDIT_LABEL })
      await edit.scrollIntoViewIfNeeded()

      const cardBox = await card(page).locator('.topic-highlight').boundingBox()
      const editBox = await edit.boundingBox()
      expect(
        cardBox && cardBox.x >= 0 && cardBox.x + cardBox.width <= width,
        `card at ${width}px`,
      ).toBe(true)
      // The pencil sits on the card's corner, not beside it.
      expect(
        cardBox &&
          editBox &&
          editBox.x >= cardBox.x &&
          editBox.x + editBox.width <= cardBox.x + cardBox.width &&
          editBox.y >= cardBox.y,
        `edit control at ${width}px`,
      ).toBe(true)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        `page at ${width}px`,
      ).toBe(false)

      await edit.click()
      const dialog = page.getByRole('dialog', { name: DIALOG_TITLE })
      const box = await dialog.boundingBox()
      expect(box && box.x >= 0 && box.x + box.width <= width, `editor at ${width}px`).toBe(true)
      await dialog.getByRole('button', { name: 'Cancelar' }).click()
      await expect(dialog).toBeHidden()
    }
  } finally {
    await account.cleanup()
  }
})
