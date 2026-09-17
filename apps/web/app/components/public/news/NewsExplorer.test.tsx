import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// jsdom has no `URL.createObjectURL`; `NewsArticleForm` calls it when a file is dropped.
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

function renderExplorer(props: NewsExplorerProps = defaultArgs) {
  return render(
    <EditModeProvider>
      <NewsExplorer {...props} />
    </EditModeProvider>,
  )
}

function renderExplorerInEditMode(props: NewsExplorerProps = defaultArgs) {
  return render(
    <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
      <NewsExplorer {...props} />
    </EditModeContext.Provider>,
  )
}

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

  test('offers editing and deleting each article, plus adding one, when edit mode is on', () => {
    renderExplorerInEditMode()

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(defaultArgs.news.length)
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(
      defaultArgs.news.length,
    )
    expect(screen.getByRole('button', { name: 'Agregar noticia' })).toBeInTheDocument()
  })

  test('PATCHes the article and refreshes the page once saving succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/news/${firstArticle?.slug}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Editar noticia' })).not.toBeInTheDocument()
  })

  test('shows the server error and keeps the modal open when saving fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No tiene permisos para modificar este contenido.' }),
    })
    renderExplorerInEditMode()

    const [firstEditButton] = screen.getAllByRole('button', { name: 'Editar' })
    await user.click(firstEditButton as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar noticia' })).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('DELETEs the article and refreshes the page once removal succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    renderExplorerInEditMode()
    const [firstArticle] = defaultArgs.news

    const [firstDeleteButton] = screen.getAllByRole('button', { name: 'Eliminar' })
    await user.click(firstDeleteButton as HTMLElement)
    const dialog = screen.getByRole('dialog', { name: 'Eliminar noticia' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(`/api/news/${firstArticle?.slug}`, {
      method: 'DELETE',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  test('POSTs a new article and refreshes the page once creation succeeds', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ article: {} }) })
    renderExplorerInEditMode()

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

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/news',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
