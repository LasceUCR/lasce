import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { GalleryGroupSection, type GalleryGroupSectionProps } from './GalleryGroupSection'
import { WithoutSubAlbums, WithSubAlbums } from './GalleryGroupSection.stories'
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
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => undefined }}>
      <GalleryGroupSection {...props} />
    </EditModeContext.Provider>,
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
        album: { ...album, id: 'album-id', coverObjectKey: '/images/galeria/rosac/8.jpg' },
        canDelete: true,
        canEdit: true,
      },
      true,
    )

    expect(screen.getByRole('button', { name: `Editar ${album.title}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Eliminar ${album.title}` })).toBeInTheDocument()
  })

  test('edits the album with AlbumForm and refreshes after a successful PATCH', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))
    const { album } = withSubAlbums
    renderSection(
      {
        ...withSubAlbums,
        album: { ...album, id: 'album-id', coverObjectKey: '/images/galeria/rosac/8.jpg' },
        canEdit: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Editar ${album.title}` }))

    expect(screen.getByRole('dialog', { name: `Editar "${album.title}"` })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'ROSAC actualizado')
    await user.clear(screen.getByRole('textbox', { name: 'Descripción' }))
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Descripción nueva.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/gallery/albums/album-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'ROSAC actualizado',
          description: 'Descripción nueva.',
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

    expect(await screen.findByRole('alert')).toHaveTextContent('No existe el álbum indicado.')
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
        album: { ...album, id: 'album-id', coverObjectKey: '/images/galeria/rosac/8.jpg' },
        canEdit: true,
      },
      true,
    )

    await user.click(screen.getByRole('button', { name: `Editar ${album.title}` }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un álbum con este slug.')
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: `Editar "${album.title}"` })).toBeInTheDocument()
  })

  test('shows the add-album control when creation is granted', () => {
    renderSection({ ...withSubAlbums, canCreate: true }, true)

    expect(screen.getByRole('button', { name: 'Añadir álbum' })).toBeInTheDocument()
  })
})
