import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  uploadNewsImage: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/app/(public)/noticias/actions', () => ({
  uploadNewsImage: mocks.uploadNewsImage,
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

import { NewsExplorer, type NewsExplorerProps } from './NewsExplorer'

const defaultArgs: NewsExplorerProps = {
  news: [
    {
      slug: 'ucr-radiotelescopio-investigar-sol',
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      authors: 'Gerardo Quesada A.',
      source: 'El Norte Hoy',
      date: '2023',
      publishedAt: '2023-10-02',
      abstract:
        'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
      href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
      imageUrl: '/images/news/el-norte-hoy-1.png',
      imageAlt: 'Radiotelescopio ROSAC.',
    },
    {
      slug: 'ucr-contara-con-radiotelescopio-explorar-cosmos',
      title: 'UCR contará con su propio radiotelescopio para explorar el cosmos',
      authors: 'Manrique Vindas Segura',
      source: 'Universidad de Costa Rica (UCR)',
      date: '2017',
      publishedAt: '2017-06-05',
      abstract:
        'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
      href: 'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
      imageUrl: '/images/news/ucr-3.png',
      imageAlt:
        'Antena instalada en la Finca Experimental de Santa Cruz (FESC) de la Universidad de Costa Rica.',
    },
  ],
}

const emptyArgs: NewsExplorerProps = {
  news: [],
}

const adminGrants = { canCreate: true, canEdit: true, canDelete: true } as const

function renderExplorer(props: NewsExplorerProps = defaultArgs) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeProvider>
        <NewsExplorer {...props} />
      </EditModeProvider>
    </ToastProvider>,
  )
}

function renderExplorerInEditMode(props: Partial<NewsExplorerProps> = {}) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <NewsExplorer {...defaultArgs} {...adminGrants} {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

function failedResponse(status: number, body: unknown) {
  return { ok: false, status, json: async () => body }
}

/** Opens "Agregar noticia", fills in a valid article with an image and submits it. */
async function submitNewArticle(user: User) {
  mocks.uploadNewsImage.mockResolvedValue({
    ok: true,
    imageUrl: 'https://s3.example/lasce/foto.png',
  })
  await user.click(screen.getByRole('button', { name: 'Agregar noticia' }))
  const dialog = screen.getByRole('dialog', { name: 'Agregar noticia' })
  await user.type(within(dialog).getByRole('textbox', { name: 'Título' }), 'Artículo nuevo')
  await user.type(within(dialog).getByRole('textbox', { name: 'Autores' }), 'Autor Nuevo')
  await user.type(within(dialog).getByRole('textbox', { name: 'Fuente' }), 'Fuente Nueva')
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Enlace' }),
    'https://example.com/nuevo',
  )
  await user.type(within(dialog).getByRole('textbox', { name: 'Resumen' }), 'Resumen nuevo.')
  const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(fileInput, new File(['imagen'], 'foto.png', { type: 'image/png' }))
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
  return dialog
}

/** Edits the first article's title and submits it. */
async function submitArticleEdit(user: User) {
  const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
  await user.click(firstEditButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Editar noticia' })
  const titleInput = within(dialog).getByRole('textbox', { name: 'Título' })
  await user.clear(titleInput)
  await user.type(titleInput, 'Título editado')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
  return dialog
}

/** Deletes the first article, accepting the "Eliminar noticia" confirmation. */
async function deleteFirstArticle(user: User) {
  const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
  await user.click(firstDeleteButton as HTMLElement)
  const dialog = screen.getByRole('dialog', { name: 'Eliminar noticia' })
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
}

const NEWS_GONE =
  'Esta noticia ya no existe. Es posible que otra persona la haya eliminado; recargue la página.'
const DUPLICATE_LINK =
  'Ya existe una noticia con este enlace. Use otro enlace o edite la noticia existente.'

afterEach(() => {
  vi.clearAllMocks()
})

describe('NewsExplorer', () => {
  test('renders one card per news article it is given', () => {
    renderExplorer()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(defaultArgs.news.length)
  })

  test('narrows the list to news matching the search query', async () => {
    const user = userEvent.setup()
    renderExplorer()

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.title)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  test('announces the number of matching results', async () => {
    const user = userEvent.setup()
    renderExplorer()

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar noticias' }),
      'UCR pone en funcionamiento',
    )

    expect(screen.getByText('Se encontró 1 noticia.')).toBeInTheDocument()
  })

  test('announces multiple matching results', async () => {
    const user = userEvent.setup()
    renderExplorer()

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), 'UCR')

    expect(screen.getByText('Se encontraron 2 noticias.')).toBeInTheDocument()
  })

  test('matches by source as well as by title', async () => {
    const user = userEvent.setup()
    renderExplorer()

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.source)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('matches by author as well as by title', async () => {
    const user = userEvent.setup()
    renderExplorer()

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.authors)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('shows an empty state when there are no news items', () => {
    renderExplorer(emptyArgs)

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No hay noticias publicadas todavía.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows an empty state when nothing matches the search query, without losing the heading', async () => {
    const user = userEvent.setup()
    renderExplorer()

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar noticias' }),
      'xyz-no-existe-esta-noticia',
    )

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron noticias')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('renders "Sin fecha" for articles without a published date', () => {
    renderExplorer({
      news: [
        {
          slug: 'sin-fecha',
          title: 'Artículo sin fecha',
          authors: 'Autor X',
          source: 'Fuente Y',
          date: 'Sin fecha',
          publishedAt: null,
          abstract: 'Resumen.',
          href: 'https://example.com',
          imageUrl: '/images/decorative/Solar-Flare.png',
          imageAlt: '',
        },
      ],
    })

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
  })

  test('hides the edit affordances when edit mode is off', () => {
    renderExplorer()

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  test('offers editing and deleting each article, plus adding one, for an admin account', () => {
    renderExplorerInEditMode()

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(defaultArgs.news.length)
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(
      defaultArgs.news.length,
    )
    expect(screen.getByRole('button', { name: 'Agregar noticia' })).toBeInTheDocument()
  })

  test('offers only editing for an assistant account without create or delete grants', () => {
    renderExplorerInEditMode({ canCreate: false, canEdit: true, canDelete: false })

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(defaultArgs.news.length)
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar noticia' })).not.toBeInTheDocument()
  })

  test('hides every editor when edit mode is on but the account has no grants', () => {
    renderExplorerInEditMode({ canCreate: false, canEdit: false, canDelete: false })

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar noticia' })).not.toBeInTheDocument()
  })

  test('PATCHes the article, refreshes the page and confirms it was updated', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    await submitArticleEdit(user)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/news/${firstArticle?.slug}`,
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('Título editado'),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Editar noticia' })).not.toBeInTheDocument()
    expect(await screen.findByText('Noticia actualizada correctamente.')).toBeInTheDocument()
  })

  test('explains a failed edit inside the open modal and keeps what was saved before', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(403, { error: 'No tiene permisos para modificar este contenido.' }),
    )
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    const dialog = await submitArticleEdit(user)

    expect(
      await within(dialog).findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveValue('Título editado')
    expect(screen.getByRole('heading', { name: firstArticle?.title as string })).toBeInTheDocument()
    expect(screen.queryByText('Noticia actualizada correctamente.')).not.toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('says the link is already used when an edit duplicates another article', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(409, { error: DUPLICATE_LINK }))
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(await within(dialog).findByText(DUPLICATE_LINK)).toBeInTheDocument()
  })

  test('says the article no longer exists when it was deleted while being edited', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(404, { error: NEWS_GONE }))
    renderExplorerInEditMode()

    const dialog = await submitArticleEdit(user)

    expect(await within(dialog).findByText(NEWS_GONE)).toBeInTheDocument()
  })

  test('lists the fields to fix when the server rejects an edit', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      failedResponse(400, {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: { externalUrl: ['El enlace debe ser una URL válida.'] },
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
    const reason =
      'No se pudo eliminar la noticia: la base de datos no respondió. Inténtelo de nuevo en unos minutos.'
    fetchMock.mockResolvedValue(failedResponse(500, { error: reason }))
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

  test('POSTs a new article, refreshes the page and confirms it was added', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()

    await submitNewArticle(user)

    expect(mocks.uploadNewsImage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/news',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://s3.example/lasce/foto.png'),
      }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Agregar noticia' })).not.toBeInTheDocument()
    expect(await screen.findByText('Noticia agregada correctamente.')).toBeInTheDocument()
  })

  test('says the link is already used and keeps the form filled in when creating', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(409, { error: DUPLICATE_LINK }))
    renderExplorerInEditMode()

    const dialog = await submitNewArticle(user)

    expect(await within(dialog).findByText(DUPLICATE_LINK)).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveValue('Artículo nuevo')
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
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    })
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

  test('shows the upload error inside the modal and does not create the article', async () => {
    const user = userEvent.setup()
    renderExplorerInEditMode()

    await user.click(screen.getByRole('button', { name: 'Agregar noticia' }))
    mocks.uploadNewsImage.mockResolvedValue({ ok: false, error: 'La imagen es demasiado grande.' })
    const dialog = screen.getByRole('dialog', { name: 'Agregar noticia' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Título' }), 'Artículo nuevo')
    await user.type(within(dialog).getByRole('textbox', { name: 'Autores' }), 'Autor Nuevo')
    await user.type(within(dialog).getByRole('textbox', { name: 'Fuente' }), 'Fuente Nueva')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Enlace' }),
      'https://example.com/nuevo',
    )
    await user.type(within(dialog).getByRole('textbox', { name: 'Resumen' }), 'Resumen nuevo.')
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'foto.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(await within(dialog).findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
