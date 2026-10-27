import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import type { NewsArticle } from '@/app/lib/news-schema'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
  usePathname: () => '/noticias',
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { VERSION, englishArticle, legacyArticle, undatedArticle } from './fixtures'
import { NewsExplorer, SEARCH_DELAY_MS, type NewsExplorerProps } from './NewsExplorer'

/** An item as an editor loads it: Spanish shown, with an English translation stored. */
function editable(article: NewsArticle): NewsArticle {
  const es = { title: article.title, abstract: article.abstract }
  const en = { title: `EN ${article.title}`, abstract: `EN ${article.abstract}` }
  return {
    ...article,
    contentLocale: 'es',
    editing: { content: { es, en }, isLegacy: false, version: VERSION },
  }
}

const defaultArgs: NewsExplorerProps = {
  news: [
    {
      slug: '0b0ed0e8-8f5a-4a8e-9a55-2f2b9f8e1a01',
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      authors: 'Gerardo Quesada A.',
      source: 'El Norte Hoy',
      date: '2 de octubre de 2023',
      publishedAt: '2023-10-02',
      abstract:
        'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
      href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
    },
    {
      slug: '0b0ed0e8-8f5a-4a8e-9a55-2f2b9f8e1a02',
      title: 'UCR contará con su propio radiotelescopio para explorar el cosmos',
      authors: 'Manrique Vindas Segura',
      source: 'Universidad de Costa Rica (UCR)',
      date: '5 de junio de 2017',
      publishedAt: '2017-06-05',
      abstract:
        'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
      href: 'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
    },
  ].map(editable),
}

const emptyArgs: NewsExplorerProps = {
  news: [],
}

const adminGrants = { canCreate: true, canEdit: true, canDelete: true } as const

function explorer(props: NewsExplorerProps) {
  return (
    <ToastProvider>
      <EditModeProvider>
        <NewsExplorer {...props} />
      </EditModeProvider>
    </ToastProvider>
  )
}

function renderExplorer(props: NewsExplorerProps = defaultArgs, locale: Locale = 'es') {
  return renderWithIntl(explorer(props), { locale })
}

/** Longer than the search delay, to check that nothing happened once it has passed. */
function afterSearchDelay() {
  return new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS + 100))
}

function searchbox(name = 'Buscar noticias') {
  return screen.getByRole('searchbox', { name })
}

/** Ten distinct items, as one full page of results. */
const fullPage = Array.from({ length: 10 }, (_, index) => ({
  ...defaultArgs.news[0]!,
  slug: `page-item-${index}`,
  title: `Noticia ${index + 1}`,
}))

function renderExplorerInEditMode(props: Partial<NewsExplorerProps> = {}, locale: Locale = 'es') {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <NewsExplorer {...defaultArgs} {...adminGrants} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
}

type User = ReturnType<typeof userEvent.setup>

/** A failed answer, as `fetch` gives it: `useRequestFeedback` reads a clone of it. */
function failedResponse(status: number, body: unknown) {
  const response = { ok: false, status, json: async () => body }
  return { ...response, clone: () => response }
}

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(container: HTMLElement, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return within(container).getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

/** Opens "Agregar noticia", fills in a valid article in both languages and submits it. */
async function submitNewArticle(user: User) {
  await user.click(screen.getByRole('button', { name: 'Agregar noticia' }))
  const dialog = screen.getByRole('dialog', { name: 'Agregar noticia' })
  await user.type(field(dialog, 'Título (Español)'), 'Artículo nuevo')
  await user.type(field(dialog, 'Resumen (Español)'), 'Resumen nuevo.')
  await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
  await user.type(field(dialog, 'Título (English)'), 'New article')
  await user.type(field(dialog, 'Resumen (English)'), 'New abstract.')
  await user.type(field(dialog, 'Autores'), 'Autor Nuevo')
  await user.type(field(dialog, 'Fuente'), 'Fuente Nueva')
  await user.type(field(dialog, 'Enlace'), 'https://example.com/nuevo')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
  return dialog
}

/** Edits the first article's source, a field shared by both languages, and submits it. */
async function submitArticleEdit(user: User) {
  const [firstEditButton] = screen.getAllByRole('button', { name: /^Editar / })
  await user.click(firstEditButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Editar noticia' })
  const sourceInput = field(dialog, 'Fuente')
  await user.clear(sourceInput)
  await user.type(sourceInput, 'Fuente editada')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
  return dialog
}

/** Deletes the first article, accepting the "Eliminar noticia" confirmation. */
async function deleteFirstArticle(user: User) {
  const [firstDeleteButton] = screen.getAllByRole('button', { name: /^Eliminar / })
  await user.click(firstDeleteButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Eliminar noticia' })
  await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

const NEWS_GONE =
  'Esta noticia ya no existe; es posible que otra persona la haya eliminado. Recargue la página.'
const DUPLICATE_LINK =
  'Ya existe una noticia con este enlace. Use otro enlace o edite la noticia existente.'

afterEach(() => {
  vi.clearAllMocks()
})

describe('NewsExplorer: listing', () => {
  test('renders one card per news article it is given', () => {
    renderExplorer()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(defaultArgs.news.length)
  })

  test('searches on the server once typing pauses, starting from the first page', async () => {
    const user = userEvent.setup()
    renderExplorer({ ...defaultArgs, page: 2, totalItems: 23 })

    await user.type(searchbox(), 'radiotelescopio')

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/noticias?q=radiotelescopio', { scroll: false }),
    )
    expect(mocks.replace).toHaveBeenCalledTimes(1)
  })

  test('searches right away when the visitor presses Enter', async () => {
    const user = userEvent.setup()
    renderExplorer()

    await user.type(searchbox(), 'sol{Enter}')

    expect(mocks.replace).toHaveBeenCalledWith('/noticias?q=sol', { scroll: false })
  })

  test('goes back to the plain listing when the search is cleared', async () => {
    const user = userEvent.setup()
    renderExplorer({ ...defaultArgs, query: 'sol', totalItems: 2 })

    await user.clear(searchbox())

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/noticias', { scroll: false }))
  })

  test('does not search again for the same text with spaces around it', async () => {
    const user = userEvent.setup()
    renderExplorer({ ...defaultArgs, query: 'sol', totalItems: 2 })

    await user.type(searchbox(), '  ')
    await afterSearchDelay()

    expect(mocks.replace).not.toHaveBeenCalled()
    expect(searchbox()).toHaveValue('sol  ')
  })

  test('shows the search of the URL in the box, after going back or forward', () => {
    const { rerender } = renderExplorer({ ...defaultArgs, query: 'sol', totalItems: 2 })

    expect(searchbox()).toHaveValue('sol')

    rerender(explorer({ ...defaultArgs, query: 'luna', totalItems: 2 }))

    expect(searchbox()).toHaveValue('luna')
  })

  test('says how many items matched the search', () => {
    renderExplorer({ ...defaultArgs, news: [defaultArgs.news[0]!], query: 'UCR', totalItems: 1 })

    expect(screen.getByText('Se encontró 1 noticia.')).toBeInTheDocument()
  })

  test('says how many items matched and which of them are shown, across pages', () => {
    renderExplorer({ news: fullPage, query: 'UCR', page: 2, totalItems: 23 })

    expect(
      screen.getByText('Se encontraron 23 noticias. Mostrando 11–20 de 23.'),
    ).toBeInTheDocument()
  })

  test('names the one item shown when the last page has only one', () => {
    renderExplorer({ news: fullPage.slice(0, 1), page: 3, totalItems: 21 })

    expect(screen.getByText('Mostrando la noticia 21 de 21.')).toBeInTheDocument()
  })

  test('says which items are shown on the last page', () => {
    renderExplorer({ news: fullPage.slice(0, 3), page: 3, totalItems: 23 })

    expect(screen.getByText('Mostrando 21–23 de 23.')).toBeInTheDocument()
  })

  test('shows an empty state when there are no news items', () => {
    renderExplorer(emptyArgs)

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No hay noticias publicadas todavía.')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows the add card instead of the empty state to someone who can add news', () => {
    renderExplorerInEditMode({ news: [] })

    expect(screen.getByRole('button', { name: 'Agregar noticia' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('shows an empty state when nothing matches the search query, without losing the heading', () => {
    renderExplorer({ news: [], query: 'xyz-no-existe-esta-noticia', totalItems: 0 })

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'No se encontraron noticias para “xyz-no-existe-esta-noticia”.',
    )
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(searchbox()).toHaveValue('xyz-no-existe-esta-noticia')
  })

  test('keeps the order it was given, which getNewsPage sets (newest first, undated last)', () => {
    renderExplorer()

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(titles).toEqual(defaultArgs.news.map((article) => article.title))
  })

  test('shows no images in the listing', () => {
    renderExplorer()

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('renders "Sin fecha" for articles without a published date', () => {
    renderExplorer({ news: [undatedArticle] })

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
  })
})

describe('NewsExplorer: pages', () => {
  test('links to the other pages of the results, keeping the search', () => {
    renderExplorer({ news: fullPage, query: 'sol', page: 2, totalItems: 23 })

    const pages = screen.getByRole('navigation', { name: 'Páginas de noticias' })
    expect(within(pages).getByRole('link', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(pages).getByRole('link', { name: 'Página 3' })).toHaveAttribute(
      'href',
      '/noticias?q=sol&page=3',
    )
    expect(within(pages).getByRole('link', { name: 'Anterior' })).toHaveAttribute(
      'href',
      '/noticias?q=sol',
    )
  })

  test('works out the number of pages from the total when it is not given', () => {
    renderExplorer({ news: fullPage, totalItems: 23 })

    const pages = screen.getByRole('navigation', { name: 'Páginas de noticias' })
    expect(within(pages).getAllByRole('link', { name: /^Página \d+$/ })).toHaveLength(3)
  })

  test('shows no page controls when the results fit on one page', () => {
    renderExplorer({ news: fullPage, totalItems: 10 })

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
  })

  test('moves focus to the list heading when another page is shown', () => {
    const { rerender } = renderExplorer({ news: fullPage, page: 1, totalItems: 23 })
    const heading = screen.getByRole('heading', { name: 'Noticias recientes' })

    expect(heading).not.toHaveFocus()

    rerender(explorer({ news: fullPage, page: 2, totalItems: 23 }))

    expect(heading).toHaveFocus()
  })
})

describe('NewsExplorer: languages', () => {
  test('shows its own copy and the items it is given in English', () => {
    renderExplorer({ news: [englishArticle, undatedArticle] }, 'en')

    expect(screen.getByRole('heading', { name: 'Recent news' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search news' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: englishArticle.title })).toHaveAttribute(
      'lang',
      'en',
    )
    expect(screen.getByText(/Undated/)).toBeInTheDocument()
  })

  test('says how many items matched and which are shown in English', () => {
    renderExplorer({ news: fullPage, query: 'storm', page: 1, totalItems: 12 }, 'en')

    expect(screen.getByText('12 news items found. Showing 1–10 of 12.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'News pages' })).toBeInTheDocument()
  })

  test('shows an item without an English version in its base text, without raw keys', () => {
    renderExplorer({ news: [{ ...legacyArticle, editing: undefined }] }, 'en')

    expect(screen.getByRole('heading', { name: legacyArticle.title })).toHaveAttribute('lang', '')
    expect(screen.queryByText(/news\./)).not.toBeInTheDocument()
  })

  test('tells editors which items have no English version', () => {
    renderExplorerInEditMode({ news: [legacyArticle] })

    expect(screen.getByText(/Sin versión en inglés/)).toBeInTheDocument()
  })
})

describe('NewsExplorer: edit mode', () => {
  test('hides the edit affordances when edit mode is off', () => {
    renderExplorer()

    expect(screen.queryByRole('button', { name: /^Editar / })).not.toBeInTheDocument()
  })

  test('offers editing and deleting each article, plus adding one, for an admin account', () => {
    renderExplorerInEditMode()

    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(
      defaultArgs.news.length,
    )
    expect(screen.getAllByRole('button', { name: /^Eliminar / })).toHaveLength(
      defaultArgs.news.length,
    )
    expect(screen.getByRole('button', { name: 'Agregar noticia' })).toBeInTheDocument()
  })

  test('names each action after its article', () => {
    renderExplorerInEditMode()

    const title = defaultArgs.news[0]!.title
    expect(screen.getByRole('button', { name: `Editar ${title}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Eliminar ${title}` })).toBeInTheDocument()
  })

  test('offers only editing for an assistant account without create or delete grants', () => {
    renderExplorerInEditMode({ canCreate: false, canEdit: true, canDelete: false })

    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(
      defaultArgs.news.length,
    )
    expect(screen.queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar noticia' })).not.toBeInTheDocument()
  })

  test('hides every editor when edit mode is on but the account has no grants', () => {
    renderExplorerInEditMode({ canCreate: false, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: /^Editar / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar noticia' })).not.toBeInTheDocument()
  })
})

describe('NewsExplorer: saving an edit', () => {
  test('PATCHes only what changed against the loaded version, refreshes and confirms it', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    await submitArticleEdit(user)

    expect(fetchMock).toHaveBeenCalledWith(`/api/news/${firstArticle?.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: VERSION, source: 'Fuente editada' }),
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Editar noticia' })).not.toBeInTheDocument()
    expect(await screen.findByText('Noticia actualizada correctamente.')).toBeInTheDocument()
  })

  test('sends both languages when a title changes in both', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    await user.click(screen.getAllByRole('button', { name: /^Editar / })[0] as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Editar noticia' })
    await user.clear(field(dialog, 'Título (Español)'))
    await user.type(field(dialog, 'Título (Español)'), 'Título editado')
    await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
    await user.clear(field(dialog, 'Título (English)'))
    await user.type(field(dialog, 'Título (English)'), 'Edited title')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    const [, init] = fetchMock.mock.calls[0]!
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Título editado', abstract: firstArticle!.abstract },
        en: { title: 'Edited title', abstract: `EN ${firstArticle!.abstract}` },
      },
    })
  })

  test('closes without a request when nothing changed', async () => {
    const user = userEvent.setup()
    renderExplorerInEditMode()

    await user.click(screen.getAllByRole('button', { name: /^Editar / })[0] as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Editar noticia' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Editar noticia' })).not.toBeInTheDocument()
  })

  test('explains a refused edit inside the open modal and keeps what was typed', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(403, { error: 'No tiene permisos para modificar este contenido.' }),
    )
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    const dialog = await submitArticleEdit(user)

    expect(
      await within(dialog).findByText(
        'No tiene permisos para esta operación. Compruebe su sesión.',
      ),
    ).toBeInTheDocument()
    expect(field(dialog, 'Fuente')).toHaveValue('Fuente editada')
    expect(screen.getByRole('heading', { name: firstArticle?.title as string })).toBeInTheDocument()
    expect(screen.queryByText('Noticia actualizada correctamente.')).not.toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('says the link is already used when an edit duplicates another article', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(409, { code: 'duplicate-external-url', error: DUPLICATE_LINK }),
    )
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(await within(dialog).findByText(DUPLICATE_LINK)).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('says someone else saved first, and reloads the list behind the open editor', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(409, { code: 'conflict', error: 'Conflicto.' }))
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(await within(dialog).findByText(/Otra persona guardó cambios/)).toBeInTheDocument()
    expect(field(dialog, 'Fuente')).toHaveValue('Fuente editada')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('says the article no longer exists when it was deleted while being edited', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(404, { code: 'not-found', error: 'No existe.' }))
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(await within(dialog).findByText(NEWS_GONE)).toBeInTheDocument()
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('lists the fields to fix when the server rejects an edit', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(400, {
        code: 'invalid-body',
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: [{ path: 'externalUrl', message: 'El enlace debe ser una URL válida.' }],
      }),
    )
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(
      await within(dialog).findByText(
        'Faltan campos obligatorios o no son válidos: El enlace debe ser una URL válida.',
      ),
    ).toBeInTheDocument()
  })

  test('explains a failure in English to an editor using the site in English', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(400, {
        code: 'invalid-body',
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: [],
      }),
    )
    renderExplorerInEditMode({}, 'en')

    await user.click(screen.getAllByRole('button', { name: /^Edit / })[0] as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Edit news item' })
    await user.clear(field(dialog, 'Source'))
    await user.type(field(dialog, 'Source'), 'Another source')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    expect(
      await within(dialog).findByText('Check the highlighted fields and try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Faltan campos/)).not.toBeInTheDocument()
  })
})

describe('NewsExplorer: deleting', () => {
  test('DELETEs the article, refreshes the page and confirms it was deleted', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    await deleteFirstArticle(user)

    expect(fetchMock).toHaveBeenCalledWith(`/api/news/${firstArticle?.slug}`, {
      method: 'DELETE',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Noticia eliminada correctamente.')).toBeInTheDocument()
  })

  test('explains a failed deletion and keeps the article listed', async () => {
    const user = userEvent.setup()
    const reason = 'No se pudo eliminar la noticia.'
    fetchMock.mockResolvedValue(failedResponse(500, { code: 'internal-error', error: reason }))
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    await deleteFirstArticle(user)

    expect(await screen.findByText(reason)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: firstArticle?.title as string })).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('falls back to a deletion-specific explanation when a failure carries no reason', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(409, {}))
    renderExplorerInEditMode()

    await deleteFirstArticle(user)

    expect(
      await screen.findByText('No se pudo eliminar la noticia. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })
})

describe('NewsExplorer: creating', () => {
  test('POSTs a new article in both languages, refreshes the page and confirms it', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()

    await submitNewArticle(user)

    expect(fetchMock).toHaveBeenCalledWith('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          es: { title: 'Artículo nuevo', abstract: 'Resumen nuevo.' },
          en: { title: 'New article', abstract: 'New abstract.' },
        },
        source: 'Fuente Nueva',
        authors: ['Autor Nuevo'],
        publishedAt: null,
        externalUrl: 'https://example.com/nuevo',
      }),
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Agregar noticia' })).not.toBeInTheDocument()
    expect(await screen.findByText('Noticia agregada correctamente.')).toBeInTheDocument()
  })

  test('says the link is already used and keeps the form filled in when creating', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(409, { code: 'duplicate-external-url', error: DUPLICATE_LINK }),
    )
    renderExplorerInEditMode()

    const dialog = await submitNewArticle(user)

    expect(await within(dialog).findByText(DUPLICATE_LINK)).toBeInTheDocument()
    expect(field(dialog, 'Fuente')).toHaveValue('Fuente Nueva')
    expect(screen.queryByText('Noticia agregada correctamente.')).not.toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('says the server could not be reached when the request never arrives', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderExplorerInEditMode()

    const dialog = await submitNewArticle(user)

    expect(
      await within(dialog).findByText(
        'No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.',
      ),
    ).toBeInTheDocument()
  })

  test('falls back to a server-side explanation when a 500 carries no reason', async () => {
    const user = userEvent.setup()
    const response = {
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    }
    fetchMock.mockResolvedValue({ ...response, clone: () => response })
    renderExplorerInEditMode()

    const dialog = await submitNewArticle(user)

    expect(
      await within(dialog).findByText(
        'El servidor no pudo completar la operación. Inténtelo de nuevo en unos minutos.',
      ),
    ).toBeInTheDocument()
  })

  test('falls back to a save-specific explanation when another failure carries no reason', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(422, {}))
    renderExplorerInEditMode()

    const dialog = await submitNewArticle(user)

    expect(
      await within(dialog).findByText('No se pudo guardar la noticia. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })
})
