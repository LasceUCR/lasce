import { randomUUID } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'
import { enableEditMode } from './helpers/edit-mode'

// Wide enough for the desktop header, where the language menu lives above 1400px.
test.use({ viewport: { width: 1600, height: 900 } })

const SOURCE = 'Fuente E2E de noticias bilingües'

/**
 * Two news items of its own per test, deleted afterwards, so the seed is never touched: one with
 * both languages and one legacy item (no translation row, English base text).
 */
async function createFixtures() {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().slice(0, 8)
  const source = await prisma.newsSource.upsert({
    where: { name: SOURCE },
    update: {},
    create: { name: SOURCE },
  })
  const author = await prisma.newsAuthor.upsert({
    where: { name: 'Autora E2E' },
    update: {},
    create: { name: 'Autora E2E' },
  })

  const bilingual = await prisma.news.create({
    data: {
      title: `Noticia bilingüe ${id}`,
      abstract: 'Resumen en español de la noticia de prueba.',
      publishedAt: new Date('2026-10-02'),
      sourceId: source.id,
      externalUrl: `https://example.org/e2e/${id}/bilingual`,
      translations: {
        create: {
          locale: 'en',
          title: `Bilingual news item ${id}`,
          abstract: 'English abstract of the test news item.',
        },
      },
      authors: { create: { position: 0, newsAuthorId: author.id } },
    },
  })

  const legacy = await prisma.news.create({
    data: {
      title: `Legacy news item ${id}`,
      abstract: 'An item saved before languages existed, written in English.',
      publishedAt: new Date('2026-10-01'),
      sourceId: source.id,
      externalUrl: `https://example.org/e2e/${id}/legacy`,
      authors: { create: { position: 0, newsAuthorId: author.id } },
    },
  })

  return {
    prisma,
    id,
    bilingual,
    legacy,
    cleanup: async () => {
      await prisma.news.deleteMany({ where: { externalUrl: { contains: `/e2e/${id}/` } } })
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
  await enableEditMode(page)
  await page.goto('/noticias')
}

function field(page: Page, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.getByRole('dialog').getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function save(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
}

/** The `datetime` of every card, in the order shown: what the chronological order is read from. */
async function shownDates(page: Page) {
  return page
    .getByRole('region', { name: /^(Noticias recientes|Recent news)$/ })
    .getByRole('article')
    .evaluateAll((articles) =>
      articles.map((article) => article.querySelector('time')?.getAttribute('datetime') ?? null),
    )
}

test('shows each item in the language chosen in the header, on the same page and in the same order', async ({
  page,
}) => {
  const fixtures = await createFixtures()
  try {
    await page.goto('/noticias')

    const spanishTitle = page.getByRole('heading', { name: fixtures.bilingual.title })
    await expect(spanishTitle).toHaveAttribute('lang', 'es')
    await expect(page.getByText('2 de octubre de 2026').first()).toBeVisible()
    // A legacy item is shown as stored, without claiming any language.
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      '',
    )
    const spanishOrder = await shownDates(page)

    await switchLanguage(page, 'Español', 'English')

    const englishTitle = page.getByRole('heading', { name: `Bilingual news item ${fixtures.id}` })
    await expect(englishTitle).toHaveAttribute('lang', 'en')
    await expect(page.getByText('English abstract of the test news item.')).toBeVisible()
    await expect(page.getByText('October 2, 2026').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recent news' })).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: `Open source of “Bilingual news item ${fixtures.id}” (opens in a new tab)`,
      }),
    ).toBeVisible()
    // The item without an English version falls back to its stored text, never to a raw key.
    await expect(page.getByRole('heading', { name: fixtures.legacy.title })).toHaveAttribute(
      'lang',
      '',
    )
    await expect(page.getByText(/news\.(page|card|editor)\./)).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveURL(/\/noticias$/)
    expect(await shownDates(page)).toEqual(spanishOrder)

    await page.reload()
    await expect(englishTitle).toBeVisible()

    await switchLanguage(page, 'English', 'Español')
    await expect(spanishTitle).toBeVisible()
  } finally {
    await fixtures.cleanup()
  }
})

test('creates a news item in both languages from the editor', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: 'Agregar noticia' }).click()

    const dialog = page.getByRole('dialog', { name: 'Agregar noticia' })
    await field(page, 'Título (Español)').fill(`Nueva noticia ${fixtures.id}`)
    await field(page, 'Resumen (Español)').fill('Resumen nuevo.')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await field(page, 'Título (English)').fill(`New news item ${fixtures.id}`)
    await field(page, 'Resumen (English)').fill('New abstract.')
    await field(page, 'Autores').fill('Autora E2E')
    await field(page, 'Fuente').fill(SOURCE)
    await field(page, 'Enlace').fill(`https://example.org/e2e/${fixtures.id}/created`)
    await save(page)

    await expect(page.getByText('Noticia agregada correctamente.')).toBeVisible()
    // An undated item is listed last, past the first page: search for it.
    await page
      .getByRole('searchbox', { name: 'Buscar noticias' })
      .fill(`Nueva noticia ${fixtures.id}`)
    await expect(page.getByRole('heading', { name: `Nueva noticia ${fixtures.id}` })).toBeVisible()

    const stored = await fixtures.prisma.news.findFirstOrThrow({
      where: { title: `Nueva noticia ${fixtures.id}` },
      include: { translations: true },
    })
    expect(stored.publishedAt).toBeNull()
    expect(stored.translations).toMatchObject([
      { locale: 'en', title: `New news item ${fixtures.id}`, abstract: 'New abstract.' },
    ])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('corrects a shared field of a legacy item without translating it', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await expect(page.getByText(/Sin versión en inglés/).first()).toBeVisible()
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()

    const dialog = page.getByRole('dialog', { name: 'Editar noticia' })
    await expect(dialog.getByRole('tab', { name: 'English · Sin traducción' })).toBeVisible()

    await field(page, 'Autores').fill('Autora E2E, Autor E2E')
    await save(page)
    await expect(dialog).toBeHidden()

    const stored = await fixtures.prisma.news.findUniqueOrThrow({
      where: { id: fixtures.legacy.id },
      include: { translations: true, authors: true },
    })
    expect(stored.authors).toHaveLength(2)
    expect(stored.title).toBe(fixtures.legacy.title)
    expect(stored.translations).toEqual([])
  } finally {
    await fixtures.prisma.newsAuthor.deleteMany({ where: { name: 'Autor E2E' } })
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

    const dialog = page.getByRole('dialog', { name: 'Editar noticia' })
    await field(page, 'Título (Español)').fill(`Noticia revisada ${fixtures.id}`)
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(dialog.getByRole('tab', { name: /^English/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await dialog.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }).click()
    await save(page)
    await expect(dialog).toBeHidden()

    const stored = await fixtures.prisma.news.findUniqueOrThrow({
      where: { id: fixtures.bilingual.id },
      include: { translations: true },
    })
    expect(stored.title).toBe(`Noticia revisada ${fixtures.id}`)
    expect(stored.translations[0]?.title).toBe(`Bilingual news item ${fixtures.id}`)
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
    await field(page, 'Fuente').fill('Fuente que no debe guardarse')

    // Someone else saves first.
    await fixtures.prisma.news.update({
      where: { id: fixtures.bilingual.id },
      data: { abstract: 'Cambio de otra persona.' },
    })

    await save(page)

    const dialog = page.getByRole('dialog', { name: 'Editar noticia' })
    await expect(dialog.getByText(/Otra persona guardó cambios/)).toBeVisible()
    await expect(field(page, 'Fuente')).toHaveValue('Fuente que no debe guardarse')

    const stored = await fixtures.prisma.news.findUniqueOrThrow({
      where: { id: fixtures.bilingual.id },
      include: { source: true },
    })
    expect(stored.abstract).toBe('Cambio de otra persona.')
    expect(stored.source.name).toBe(SOURCE)
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('deletes a news item together with its translation', async ({ page, context }) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await openEditMode(page)
    await page.getByRole('button', { name: `Eliminar ${fixtures.bilingual.title}` }).click()
    const confirm = page.getByRole('dialog', { name: 'Eliminar noticia' })
    await expect(confirm).toContainText(
      `¿Desea eliminar la noticia "${fixtures.bilingual.title}"? Esta acción no se puede deshacer.`,
    )
    await confirm.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByRole('heading', { name: fixtures.bilingual.title })).toBeHidden()
    await expect
      .poll(() =>
        fixtures.prisma.newsTranslation.count({ where: { newsId: fixtures.bilingual.id } }),
      )
      .toBe(0)
    expect(await fixtures.prisma.news.count({ where: { id: fixtures.bilingual.id } })).toBe(0)
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
    await page.goto('/noticias')
    await switchLanguage(page, 'Español', 'English')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(
      page.getByRole('heading', { level: 1, name: 'News and media coverage' }),
    ).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search news' })).toBeVisible()
    await expect(page).toHaveTitle('News | LASCE')
    expect((await axe().analyze()).violations).toEqual([])

    // The editor follows the site's language: everything it says is in English.
    await openEditMode(page)
    await page.getByRole('button', { name: `Edit ${fixtures.legacy.title}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit news item' })
    await expect(dialog.getByText(/may not be in Spanish/)).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])

    // Changing the Spanish title asks for the English title, not for the untouched abstract.
    await field(page, 'Title (Español)').fill('Título nuevo')
    await dialog.getByRole('button', { name: 'Confirm' }).click()
    await expect(dialog.getByRole('tab', { name: /^English · 2 to review/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(
      dialog.getByRole('switch', { name: 'The English title is still correct' }),
    ).toBeVisible()
    await expect(dialog.getByText('The English title is required.')).toBeVisible()
    expect((await axe().include('dialog[open]').analyze()).violations).toEqual([])
  } finally {
    await fixtures.cleanup()
    await account.cleanup()
  }
})

test('keeps the page and the bilingual editor inside the viewport from phones to desktops', async ({
  page,
  context,
}) => {
  const fixtures = await createFixtures()
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    for (const locale of ['es', 'en'] as const) {
      await context.addCookies([
        { name: 'lasce_locale', value: locale, url: 'http://localhost:3000' },
      ])
      await page.goto('/noticias')
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow, `${locale} page at ${width}px`).toBe(false)
      }
    }

    await context.addCookies([{ name: 'lasce_locale', value: 'es', url: 'http://localhost:3000' }])
    await page.setViewportSize({ width: 1600, height: 900 })
    await openEditMode(page)
    await page.getByRole('button', { name: `Editar ${fixtures.legacy.title}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Editar noticia' })

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
