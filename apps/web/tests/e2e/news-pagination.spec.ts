import { randomUUID } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createSignedInUser } from './helpers/admin-users'
import { enableEditMode } from './helpers/edit-mode'

// LASCE-PAG-001: the news listing is searched and paginated on the server, 10 items per page.
// Every test creates its own 23 items, tagged so a search finds them and nothing else, and
// deletes them afterwards. Wide enough for the desktop header, where the language menu lives.
test.use({ viewport: { width: 1600, height: 900 } })

const SOURCE = 'Fuente E2E de paginación'
const AUTHOR = 'Autora E2E de paginación'

/**
 * 23 items, newest first in index order. `tag` is in every title in both languages. `languageTag`
 * is in the Spanish title of the first 12 and in the English title of the first 3 only, so the
 * same search has two pages in Spanish and one in English.
 */
async function createFixtures() {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().replaceAll('-', '').slice(0, 10)
  const tag = `pag${id}`
  const languageTag = `idioma${id}`
  const source = await prisma.newsSource.upsert({
    where: { name: SOURCE },
    update: {},
    create: { name: SOURCE },
  })
  const author = await prisma.newsAuthor.upsert({
    where: { name: AUTHOR },
    update: {},
    create: { name: AUTHOR },
  })

  const titles: string[] = []
  for (let index = 0; index < 23; index += 1) {
    const number = index + 1
    const title = `Noticia ${number} ${tag}${index < 12 ? ` ${languageTag}` : ''}`
    titles.push(title)
    await prisma.news.create({
      data: {
        title,
        abstract: `Resumen de la noticia ${number}.`,
        // One day apart, newest first: 2001-02-01, 2001-01-31, ...
        publishedAt: new Date(Date.UTC(2001, 1, 1 - index)),
        sourceId: source.id,
        externalUrl: `https://example.org/e2e/${id}/${number}`,
        translations: {
          create: {
            locale: 'en',
            title: `News item ${number} ${tag}${index < 3 ? ` ${languageTag}` : ''}`,
            abstract: `Abstract of news item ${number}.`,
          },
        },
        authors: { create: { position: 0, newsAuthorId: author.id } },
      },
    })
  }

  return {
    prisma,
    id,
    tag,
    languageTag,
    titles,
    cleanup: async () => {
      await prisma.news.deleteMany({ where: { externalUrl: { contains: `/e2e/${id}/` } } })
    },
  }
}

type Fixtures = Awaited<ReturnType<typeof createFixtures>>

let fixtures: Fixtures

test.beforeEach(async () => {
  fixtures = await createFixtures()
})

test.afterEach(async () => {
  await fixtures.cleanup()
})

function newsList(page: Page) {
  return page.getByRole('region', { name: /^(Noticias recientes|Recent news)$/ })
}

function cards(page: Page) {
  return newsList(page).getByRole('article')
}

function pagination(page: Page) {
  return page.getByRole('navigation', { name: /^(Páginas de noticias|News pages)$/ })
}

async function shownTitles(page: Page) {
  return cards(page).getByRole('heading', { level: 3 }).allTextContents()
}

function search(query: string, pageNumber?: number) {
  const params = new URLSearchParams({ q: query })
  if (pageNumber) params.set('page', String(pageNumber))
  return `/noticias?${params.toString()}`
}

/**
 * The URL's query string as an object, so the order of the parameters does not matter. Read it
 * through `expect.poll`: a client-side navigation updates the URL a moment after the click.
 */
function queryOf(page: Page) {
  return Object.fromEntries(new URL(page.url()).searchParams)
}

const languageMenuLabel = { Español: 'Idioma: Español', English: 'Language: English' } as const

async function switchLanguage(page: Page, from: 'Español' | 'English', to: 'Español' | 'English') {
  await page.getByRole('banner').getByLabel(languageMenuLabel[from]).click()
  await page.getByRole('banner').getByRole('button', { name: to }).click()
}

test('opens on the first page of 10, newest first, without signing in', async ({ page }) => {
  await page.goto('/noticias')

  await expect(cards(page)).toHaveCount(10)
  await expect(pagination(page).getByRole('link', { name: 'Página 1' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page).toHaveURL(/\/noticias$/)
  await expect(page.getByRole('button', { name: 'Agregar noticia' })).toHaveCount(0)

  await page.goto(search(fixtures.tag))

  await expect(cards(page)).toHaveCount(10)
  expect(await shownTitles(page)).toEqual(fixtures.titles.slice(0, 10))
  await expect(page.getByText('Se encontraron 23 noticias. Mostrando 1–10 de 23.')).toBeVisible()
})

test('splits 23 items into pages of 10, 10 and 3, each item shown once', async ({ page }) => {
  await page.goto(search(fixtures.tag))

  const seen: string[] = []
  for (const [number, size] of [
    [1, 10],
    [2, 10],
    [3, 3],
  ] as const) {
    if (number > 1)
      await pagination(page)
        .getByRole('link', { name: `Página ${number}` })
        .click()

    await expect(cards(page)).toHaveCount(size)
    await expect(pagination(page).getByRole('link', { name: `Página ${number}` })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect
      .poll(() => queryOf(page))
      .toEqual(number === 1 ? { q: fixtures.tag } : { q: fixtures.tag, page: String(number) })
    seen.push(...(await shownTitles(page)))
  }

  expect(seen).toEqual(fixtures.titles)
  await expect(pagination(page).getByRole('link', { name: /^Página \d+$/ })).toHaveCount(3)
})

test('moves between pages with Siguiente and Anterior, from the keyboard too', async ({ page }) => {
  await page.goto(search(fixtures.tag))

  await pagination(page).getByRole('link', { name: 'Siguiente' }).focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/page=2/)
  await expect(cards(page).first()).toContainText(fixtures.titles[10]!)
  // The new page starts at the list's heading, not at the link that was followed.
  await expect(page.getByRole('heading', { name: 'Noticias recientes' })).toBeFocused()

  await pagination(page).getByRole('link', { name: 'Anterior' }).click()

  await expect(cards(page).first()).toContainText(fixtures.titles[0]!)
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag })
})

test('offers no previous page on the first page and no next page on the last', async ({ page }) => {
  await page.goto(search(fixtures.tag))
  await expect(pagination(page).getByRole('link', { name: 'Anterior' })).toHaveCount(0)
  await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toBeVisible()

  await page.goto(search(fixtures.tag, 3))
  await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  await expect(pagination(page).getByRole('link', { name: 'Anterior' })).toBeVisible()
})

test('hides the page controls when the results fit on one page', async ({ page }) => {
  // Only item 2: "Noticia 20 …" does not contain "Noticia 2 …".
  await page.goto(search(`Noticia 2 ${fixtures.tag}`))

  await expect(cards(page)).toHaveCount(1)
  await expect(pagination(page)).toHaveCount(0)
})

test('corrects a malformed, zero, negative or too large page in the URL', async ({ page }) => {
  for (const value of ['abc', '0', '-2', '1.5', '1']) {
    await page.goto(`/noticias?q=${fixtures.tag}&page=${value}`)

    await expect
      .poll(() => queryOf(page), { message: `page=${value}` })
      .toEqual({ q: fixtures.tag })
    await expect(cards(page)).toHaveCount(10)
  }

  await page.goto(search(fixtures.tag, 99))

  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '3' })
  await expect(cards(page)).toHaveCount(3)
  await expect(pagination(page).getByRole('link', { name: 'Página 3' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('searches the whole collection by title, author or source, from the first page', async ({
  page,
}) => {
  await page.goto('/noticias?page=2')

  await page.getByRole('searchbox', { name: 'Buscar noticias' }).fill(fixtures.tag)

  await expect(page).toHaveURL(new RegExp(`\\?q=${fixtures.tag}$`))
  await expect(page.getByText('Se encontraron 23 noticias. Mostrando 1–10 de 23.')).toBeVisible()

  await page.goto(search(AUTHOR.toUpperCase()))
  await expect(page.getByText(/^Se encontraron \d+ noticias\./)).toBeVisible()
  await expect(cards(page).filter({ hasText: fixtures.tag }).first()).toBeVisible()

  await page.goto(search(SOURCE))
  await expect(cards(page).filter({ hasText: fixtures.tag }).first()).toBeVisible()
})

test('keeps the search while moving between pages, and clears it back to the plain listing', async ({
  page,
}) => {
  await page.goto(search(fixtures.tag, 2))

  const box = page.getByRole('searchbox', { name: 'Buscar noticias' })
  await expect(box).toHaveValue(fixtures.tag)
  await pagination(page).getByRole('link', { name: 'Página 3' }).click()
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '3' })

  await box.fill('')

  await expect(page).toHaveURL(/\/noticias$/)
  await expect(cards(page)).toHaveCount(10)
})

test('restores the page and the search from the URL on reload, back and forward', async ({
  page,
}) => {
  await page.goto(search(fixtures.tag))
  await pagination(page).getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await pagination(page).getByRole('link', { name: 'Página 3' }).click()
  await expect(cards(page)).toHaveCount(3)

  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(cards(page).first()).toContainText(fixtures.titles[10]!)
  await expect(page.getByRole('searchbox', { name: 'Buscar noticias' })).toHaveValue(fixtures.tag)

  await page.goForward()
  await expect(cards(page)).toHaveCount(3)

  await page.reload()
  await expect(cards(page)).toHaveCount(3)
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '3' })
})

test('keeps the search and the page when the language changes, while that page exists', async ({
  page,
}) => {
  await page.goto(search(fixtures.tag, 3))

  await switchLanguage(page, 'Español', 'English')

  await expect(page.getByRole('heading', { name: 'Recent news' })).toBeVisible()
  await expect(cards(page).first()).toContainText(`News item 21 ${fixtures.tag}`)
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '3' })
  await expect(pagination(page).getByRole('link', { name: 'Previous' })).toBeVisible()
  await expect(pagination(page).getByRole('link', { name: 'Page 3' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByText('23 news items found. Showing 21–23 of 23.')).toBeVisible()
})

test('moves to the last page left when the translated results have fewer pages', async ({
  page,
}) => {
  await page.goto(search(fixtures.languageTag, 2))
  await expect(cards(page)).toHaveCount(2)

  await switchLanguage(page, 'Español', 'English')

  await expect(page.getByText('3 news items found.')).toBeVisible()
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.languageTag })
  await expect(cards(page)).toHaveCount(3)
  await expect(pagination(page)).toHaveCount(0)
})

test('shows a translated empty state, and no page controls, when nothing matches', async ({
  page,
}) => {
  const nothing = `nada${fixtures.id}`
  await page.goto(search(nothing, 4))

  await expect.poll(() => queryOf(page)).toEqual({ q: nothing })
  await expect(newsList(page).getByRole('status')).toHaveText(
    `No se encontraron noticias para “${nothing}”.`,
  )
  await expect(pagination(page)).toHaveCount(0)
  await expect(page.getByRole('searchbox', { name: 'Buscar noticias' })).toHaveValue(nothing)

  await switchLanguage(page, 'Español', 'English')
  await expect(newsList(page).getByRole('status')).toHaveText(`No news found for “${nothing}”.`)
})

test('refreshes the results and the totals after news is added or deleted', async ({
  page,
  context,
}) => {
  const account = await createSignedInUser(context, 'ADMIN')
  const added = `Noticia agregada ${fixtures.tag}`
  try {
    await page.goto('/administracion')
    await enableEditMode(page)

    // Adding an item keeps the page shown and counts it in the totals.
    await page.goto(search(fixtures.tag, 2))
    await page.getByRole('button', { name: 'Agregar noticia' }).click()
    const dialog = page.getByRole('dialog', { name: 'Agregar noticia' })
    await dialog.getByRole('textbox', { name: /^Título \(Español\)/ }).fill(added)
    await dialog.getByRole('textbox', { name: /^Resumen \(Español\)/ }).fill('Resumen.')
    await dialog.getByRole('tab', { name: /^English/ }).click()
    await dialog.getByRole('textbox', { name: /^Título \(English\)/ }).fill(`Added ${fixtures.tag}`)
    await dialog.getByRole('textbox', { name: /^Resumen \(English\)/ }).fill('Abstract.')
    await dialog.getByRole('textbox', { name: /^Autores/ }).fill(AUTHOR)
    await dialog.getByRole('textbox', { name: /^Fuente/ }).fill(SOURCE)
    // Newer than every item of the listing, so it lands on page 1 and page 2 stays full.
    await dialog.getByLabel(/^Fecha/).fill('2001-03-01')
    await dialog
      .getByRole('textbox', { name: /^Enlace/ })
      .fill(`https://example.org/e2e/${fixtures.id}/added`)
    await dialog.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Noticia agregada correctamente.')).toBeVisible()
    await expect(page.getByText('Se encontraron 24 noticias. Mostrando 11–20 de 24.')).toBeVisible()
    await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '2' })

    // Deleting the last items of the last page moves to the page before it.
    await page.goto(search(fixtures.tag, 3))
    await expect(cards(page)).toHaveCount(4)
    for (let left = 4; left > 0; left -= 1) {
      const title = await cards(page).first().getByRole('heading', { level: 3 }).textContent()
      await page.getByRole('button', { name: `Eliminar ${title}` }).click()
      await page
        .getByRole('dialog', { name: 'Eliminar noticia' })
        .getByRole('button', { name: 'Eliminar' })
        .click()
      await expect(page.getByRole('heading', { name: title ?? '' })).toHaveCount(0)
    }

    await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '2' })
    await expect(cards(page)).toHaveCount(10)
    await expect(page.getByText('Se encontraron 20 noticias. Mostrando 11–20 de 20.')).toBeVisible()
    await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  } finally {
    await account.cleanup()
  }
})

test('fits the page controls on every screen, with the page count on phones', async ({ page }) => {
  await page.goto(search(fixtures.tag, 2))

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)

    const status = pagination(page).getByText('Página 2 de 3')
    const numbers = pagination(page).getByRole('link', { name: 'Página 1' })
    if (width <= 600) {
      await expect(status).toBeVisible()
      await expect(numbers).toBeHidden()
    } else {
      await expect(status).toBeHidden()
      await expect(numbers).toBeVisible()
    }
    await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toBeVisible()
  }
})

test('meets WCAG A and AA automated checks with the page controls shown', async ({ page }) => {
  await page.goto(search(fixtures.tag, 2))
  await expect(pagination(page)).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
