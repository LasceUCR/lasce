import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { GalleryGroupSection, type GalleryGroupSectionProps } from './GalleryGroupSection'
import { WithoutSubAlbums, WithSubAlbums } from './GalleryGroupSection.stories'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

function albumMeta(album: GalleryGroupSectionProps['album']): string {
  const fileCount = album.subAlbums.reduce(
    (total, subAlbum) => total + subAlbum.media.length,
    album.media.length,
  )
  return `${album.subAlbums.length ? `${album.subAlbums.length} subálbumes · ` : ''}${fileCount} archivos · ${album.years}`
}

const withSubAlbums = WithSubAlbums.args as GalleryGroupSectionProps
const withoutSubAlbums = WithoutSubAlbums.args as GalleryGroupSectionProps

function renderSection(props: GalleryGroupSectionProps, editMode = false) {
  return renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => undefined }}>
        <GalleryGroupSection {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GalleryGroupSection', () => {
  test('names the album and summarises what it holds', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    expect(screen.getByRole('heading', { level: 2, name: album.title })).toBeInTheDocument()
    expect(screen.getByText(album.description)).toBeInTheDocument()
    expect(screen.getAllByText(albumMeta(album)).length).toBeGreaterThan(0)
  })

  test('links the cover to the album and every sub-album to its own page', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    expect(screen.getByRole('link', { name: new RegExp(album.title) })).toHaveAttribute(
      'href',
      '/galeria/rosac',
    )

    for (const subAlbum of album.subAlbums) {
      expect(screen.getByRole('link', { name: new RegExp(subAlbum.title) })).toHaveAttribute(
        'href',
        `/galeria/rosac/${subAlbum.slug}`,
      )
    }
  })

  test('counts each sub-album from the files it actually holds', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    // Two sub-albums hold the same number of files, so match on the tile
    // rather than on the count alone.
    for (const subAlbum of album.subAlbums) {
      const tile = screen.getByRole('link', { name: new RegExp(subAlbum.title) })

      expect(tile).toHaveTextContent(`${subAlbum.media.length} archivos`)
    }
  })

  test('presents the cover and its sub-albums as one list', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1 + album.subAlbums.length)
  })

  test('titles every tile one level below the album heading', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)

    expect(titles).toEqual([album.title, ...album.subAlbums.map((subAlbum) => subAlbum.title)])
  })

  test('renders the cover on its own when the album has no sub-albums', () => {
    renderSection(withoutSubAlbums)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText(/^\d+ archivos$/)).not.toBeInTheDocument()
  })

  test('shows album editing controls when edit mode and grants are enabled', () => {
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: {
          ...album,
          id: 'album-id',
          coverObjectKey: '/images/galeria/rosac/8.jpg',
        },
        canDelete: true,
        canEdit: true,
      },
      true,
    )

    expect(screen.getByRole('button', { name: `Editar ${album.title}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Eliminar ${album.title}` })).toBeInTheDocument()
  })

  test.each([
    ['canEdit', 'Editar', 'Eliminar'],
    ['canDelete', 'Eliminar', 'Editar'],
  ])('only offers the action granted by %s', (grant, shown, hidden) => {
    const { album } = withSubAlbums
    renderSection({ ...withSubAlbums, album: { ...album, id: 'album-id' }, [grant]: true }, true)

    expect(screen.getByRole('button', { name: `${shown} ${album.title}` })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `${hidden} ${album.title}` }),
    ).not.toBeInTheDocument()
  })

  test('edits the album with AlbumForm and refreshes after a successful PATCH', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: {
          ...album,
          id: 'album-id',
          coverObjectKey: '/images/galeria/rosac/8.jpg',
          editing: {
            isLegacy: false,
            version: 'v1',
            content: {
              es: { title: album.title, description: album.description },
              en: { title: 'ROSAC', description: 'ROSAC description.' },
            },
          },
        },
        canEdit: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Editar ${album.title}` }))

    expect(screen.getByRole('dialog', { name: `Editar "${album.title}"` })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Título (Español)' }))
    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), 'ROSAC actualizado')
    await user.clear(screen.getByRole('textbox', { name: 'Descripción (Español)' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción (Español)' }),
      'Descripción nueva.',
    )
    await user.click(screen.getByRole('tab', { name: /English/ }))
    for (const toggle of screen.getAllByRole('switch')) await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/gallery/albums/album-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'v1',
          content: {
            es: { title: 'ROSAC actualizado', description: 'Descripción nueva.' },
            en: { title: 'ROSAC', description: 'ROSAC description.' },
          },
          confirmedUnchanged: [
            { locale: 'en', field: 'title' },
            { locale: 'en', field: 'description' },
          ],
          yearsLabel: '2019–2023',
          coverObjectKey: '/images/galeria/rosac/8.jpg',
        }),
      })
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('dialog', { name: `Editar "${album.title}"` }),
    ).not.toBeInTheDocument()
  })

  test('confirms discard from Cancelar, Escape, and a modal close request', async () => {
    const user = userEvent.setup()
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: {
          ...album,
          id: 'album-id',
          editing: {
            isLegacy: false,
            version: 'v1',
            content: {
              es: { title: album.title, description: album.description },
              en: { title: 'ROSAC', description: 'ROSAC description.' },
            },
          },
        },
        canEdit: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Editar ${album.title}` }))
    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), ' editado')

    const editor = screen.getByRole('dialog', { name: `Editar "${album.title}"` })
    fireEvent(editor, new Event('close'))
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      `${album.title} editado`,
    )

    await user.keyboard('{Escape}')
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(
      screen.queryByRole('dialog', { name: `Editar "${album.title}"` }),
    ).not.toBeInTheDocument()
  })

  test('confirms album deletion, calls DELETE, and refreshes after success', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: { ...album, id: 'album-id' },
        canDelete: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Eliminar ${album.title}` }))
    expect(screen.getByRole('dialog', { name: 'Eliminar álbum' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/gallery/albums/album-id', { method: 'DELETE' })
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(await screen.findByText('Álbum eliminado correctamente.')).toBeInTheDocument()
  })

  test('shows the server error when album deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'No existe el álbum indicado.' }, { status: 404 }),
    )
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: { ...album, id: 'album-id' },
        canDelete: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Eliminar ${album.title}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('No existe el álbum indicado.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  test('shows the server error and keeps the edit form open when saving fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'Ya existe un álbum con este slug.' }, { status: 409 }),
    )
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: {
          ...album,
          id: 'album-id',
          coverObjectKey: '/images/galeria/rosac/8.jpg',
          editing: {
            isLegacy: false,
            version: 'v1',
            content: {
              es: { title: album.title, description: album.description },
              en: { title: 'ROSAC', description: 'ROSAC description.' },
            },
          },
        },
        canEdit: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Editar ${album.title}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Ya existe un álbum con este slug.')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: `Editar "${album.title}"` })).toBeInTheDocument()
  })
})
