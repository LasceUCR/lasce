import { randomUUID } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'

// Wide enough for the desktop header, where the language menu lives above 1400px.
test.use({ viewport: { width: 1600, height: 900 } })

const PUBLISHER = 'Revista E2E de publicaciones bilingües'

/**
 * Two publications of its own per test, deleted afterwards, so the seed is never touched: one
 * with both languages and one legacy record (no translation row, English base text).
 */
async function createFixtures() {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().slice(0, 8)
  const publisher = await prisma.publisher.upsert({
    where: { name: PUBLISHER },
    update: {},
    create: { name: PUBLISHER },
  })
  const author = await prisma.researchAuthor.upsert({
    where: { name: 'Autora E2E' },
    update: {},
    create: { name: 'Autora E2E' },
  })

  const bilingual = await prisma.research.create({
    data: {
      title: `Publicación bilingüe ${id}`,
      abstract: 'Resumen en español de la publicación de prueba.',
      publicationDate: new Date('2026-10-02'),
      publisherId: publisher.id,
      researchGroup: 'LASCE',
      doi: `10.9999/e2e-${id}`,
      translations: {
        create: {
          locale: 'en',
          title: `Bilingual publication ${id}`,
          abstract: 'English abstract of the test publication.',
        },
      },
      authors: { create: { position: 0, researchAuthorId: author.id } },
    },
  })

  const legacy = await prisma.research.create({
    data: {
      title: `Legacy record ${id}`,
      abstract: 'A record saved before languages existed, written in English.',
      publicationDate: new Date('2026-10-01'),
      publisherId: publisher.id,
      researchGroup: 'ROSAC',
      authors: { create: { position: 0, researchAuthorId: author.id } },
    },
  })

  return {
    prisma,
    id,
    bilingual,
    legacy,
    cleanup: async () => {
      await prisma.research.deleteMany({
        where: { OR: [{ id: { in: [bilingual.id, legacy.id] } }, { title: { contains: id } }] },
      })
    },
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
  await page.goto('/publicaciones')
}

function field(page: Page, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.getByRole('dialog').getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function confirmSave(page: Page, title = 'Guardar cambios') {
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Confirmar' }).click()
}

test('shows each publication in the language chosen in the header, and remembers it', async ({
  page,
}) => {
  const fixtures = await createFixtures()
  try {
    await page.goto('/publicaciones')

    const spanishTitle = page.getByRole('heading', { name: fixtures.bilingual.title })
    await expect(spanishTitle).toHaveAttribute('lang', 'es')
    // A legacy record is shown as stored, without claiming any language.
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      '',
    )

    await switchLanguage(page, 'Español', 'English')

    const englishTitle = page.getByRole('heading', { name: `Bilingual publication ${fixtures.id}` })
    await expect(englishTitle).toHaveAttribute('lang', 'en')
    await expect(page.getByText('English abstract of the test publication.')).toBeVisible()
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      '',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveURL(/\/publicaciones$/)

    await page.reload()
    await expect(englishTitle).toBeVisible()

    await switchLanguage(page, 'English', 'Español')
    await expect(spanishTitle).toBeVisible()
  } finally {
    await fixtures.cleanup()
  }
})

test('creates a publication in both languages from the editor', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: 'Añadir' }).click()

    const dialog = page.getByRole('dialog', { name: 'Añadir' })
    await field(page, 'Título (Español)').fill(`Nueva publicación ${fixtures.id}`)
    await field(page, 'Resumen (Español)').fill('Resumen nuevo.')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await field(page, 'Título (English)').fill(`New publication ${fixtures.id}`)
    await field(page, 'Resumen (English)').fill('New abstract.')
    await dialog.getByRole('button', { name: 'Añadir autor' }).click()
    await page
      .getByRole('dialog', { name: 'Añadir autor' })
      .getByRole('textbox', { name: 'Nombre del autor' })
      .fill('Autora E2E')
    await page
      .getByRole('dialog', { name: 'Añadir autor' })
      .getByRole('button', { name: 'Añadir' })
      .click()
    await field(page, 'Revista/Publicación').fill(PUBLISHER)
    await confirmSave(page, 'Agregar publicación')

    await expect(
      page.getByRole('heading', { name: `Nueva publicación ${fixtures.id}` }),
    ).toBeVisible()

    const stored = await fixtures.prisma.research.findFirstOrThrow({
      where: { title: `Nueva publicación ${fixtures.id}` },
      include: { translations: true },
    })
    expect(stored.doi).toBeNull()
    expect(stored.externalUrl).toBeNull()
    expect(stored.translations).toMatchObject([
      { locale: 'en', title: `New publication ${fixtures.id}`, abstract: 'New abstract.' },
    ])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('corrects a shared field of a legacy record without translating it', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()

    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.legacy.title}"` })
    await expect(dialog.getByRole('tab', { name: 'English · Sin traducción' })).toBeVisible()

    await field(page, 'DOI').fill(`10.9999/e2e-${fixtures.id}-legacy`)
    await confirmSave(page)
    await expect(dialog).toBeHidden()

    const stored = await fixtures.prisma.research.findUniqueOrThrow({
      where: { id: fixtures.legacy.id },
      include: { translations: true },
    })
    expect(stored.doi).toBe(`10.9999/e2e-${fixtures.id}-legacy`)
    expect(stored.title).toBe(fixtures.legacy.title)
    expect(stored.translations).toEqual([])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('asks to confirm the other language before saving a one-sided change', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.bilingual.title}` }).click()

    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.bilingual.title}"` })
    await field(page, 'Título (Español)').fill(`Publicación revisada ${fixtures.id}`)
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(dialog.getByRole('tab', { name: /^English/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await dialog.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }).click()
    await confirmSave(page)
    await expect(dialog).toBeHidden()

    const stored = await fixtures.prisma.research.findUniqueOrThrow({
      where: { id: fixtures.bilingual.id },
      include: { translations: true },
    })
    expect(stored.title).toBe(`Publicación revisada ${fixtures.id}`)
    expect(stored.translations[0]?.title).toBe(`Bilingual publication ${fixtures.id}`)
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('refuses to overwrite a change another editor saved meanwhile', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.bilingual.title}` }).click()
    await field(page, 'Revista/Publicación').fill('Revista que no debe guardarse')

    // Someone else saves first.
    await fixtures.prisma.research.update({
      where: { id: fixtures.bilingual.id },
      data: { abstract: 'Cambio de otra persona.' },
    })

    await confirmSave(page)

    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.bilingual.title}"` })
    await expect(dialog.getByText(/Otra persona guardó cambios/)).toBeVisible()
    await expect(field(page, 'Revista/Publicación')).toHaveValue('Revista que no debe guardarse')

    const stored = await fixtures.prisma.research.findUniqueOrThrow({
      where: { id: fixtures.bilingual.id },
      include: { publisher: true },
    })
    expect(stored.abstract).toBe('Cambio de otra persona.')
    expect(stored.publisher.name).toBe(PUBLISHER)
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('deletes a publication together with its translation', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Eliminar ${fixtures.bilingual.title}` }).click()
    await page
      .getByRole('dialog', { name: 'Eliminar publicacion' })
      .getByRole('button', { name: /Eliminar|Confirmar/ })
      .click()

    await expect(page.getByRole('heading', { name: fixtures.bilingual.title })).toBeHidden()
    await expect
      .poll(() =>
        fixtures.prisma.researchTranslation.count({ where: { researchId: fixtures.bilingual.id } }),
      )
      .toBe(0)
    expect(await fixtures.prisma.research.count({ where: { id: fixtures.bilingual.id } })).toBe(0)
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('meets WCAG A and AA automated checks in English and in the bilingual editor', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  const axe = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  try {
    await page.goto('/publicaciones')
    await switchLanguage(page, 'Español', 'English')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect((await axe().analyze()).violations).toEqual([])

    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()
    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.legacy.title}"` })
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])

    // With errors, a pending review and its switch on screen.
    await field(page, 'Título (Español)').fill('Título nuevo')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(
      dialog.getByRole('switch', { name: 'El resumen en español sigue siendo correcto' }),
    ).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])

    await dialog.getByRole('tab', { name: /^English/ }).click()
    await expect(dialog.getByText('El título en inglés es obligatorio.')).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('keeps the bilingual editor inside the viewport from phones to desktops', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()
    const dialog = page.getByRole('dialog', { name: `Editar "${fixtures.legacy.title}"` })

    // Put the longest labels on screen: a flag on both tabs, errors and a review switch.
    await field(page, 'Título (Español)').fill('Título traducido')
    await dialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(dialog.getByRole('tab', { name: /^English · 2 por revisar$/ })).toBeVisible()

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const language of ['Español', 'English']) {
        await dialog.getByRole('tab', { name: new RegExp(`^${language}`) }).click()
        const overflow = await dialog.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const outside = Array.from(
            element.querySelectorAll('input, textarea, select, button, [role="tab"]'),
          ).filter((control) => {
            const bounds = control.getBoundingClientRect()
            return (
              bounds.width > 0 && (bounds.left < rect.left - 1 || bounds.right > rect.right + 1)
            )
          })
          return {
            dialog: rect.left < 0 || rect.right > innerWidth,
            page: document.documentElement.scrollWidth > innerWidth,
            controls: outside.map((control) => control.textContent || control.tagName),
          }
        })
        expect(overflow, `${language} tab at ${width}px`).toEqual({
          dialog: false,
          page: false,
          controls: [],
        })
      }
    }
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})
