import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { GalleryGroupSection, type GalleryGroupSectionProps } from './GalleryGroupSection'
import { WithoutSubAlbums, WithSubAlbums } from './GalleryGroupSection.stories'
import type { GalleryMedia } from '@/app/lib/gallery-schema'
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

function firstItem<T>(items: readonly T[]): T {
  const item = items[0]
  if (item === undefined) throw new Error('Expected the gallery story fixture to contain an item')
  return item
}

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

    const description = screen.getByText(album.description)
    const count = description.nextElementSibling
    expect(count).toHaveClass('gallery-group-meta')
    expect(count).toHaveTextContent(albumMeta(album))
  })

  test('provides a full-screen control for each featured photo', () => {
    const { album } = withSubAlbums
    renderSection(withSubAlbums)

    const parentPhoto = firstItem(album.media)
    const subAlbum = firstItem(album.subAlbums)
    const subAlbumPhoto = firstItem(subAlbum.media)

    expect(
      screen.getByRole('button', {
        name: `Ver imagen a pantalla completa: ${parentPhoto.title}`,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `Ver imagen a pantalla completa: ${subAlbumPhoto.title}`,
      }),
    ).toBeInTheDocument()
  })

  test('opens a featured photo in the full-screen lightbox and pages through the featured images', async () => {
    const user = userEvent.setup()
    const album = withSubAlbums.album
    const firstPhoto = firstItem(album.media)
    const nextPhoto = firstItem(firstItem(album.subAlbums).media)
    renderSection(withSubAlbums)

    const trigger = screen.getByRole('button', {
      name: `Ver imagen a pantalla completa: ${firstPhoto.title}`,
    })
    const nextTrigger = screen.getByRole('button', {
      name: `Ver imagen a pantalla completa: ${nextPhoto.title}`,
    })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { level: 2, name: firstPhoto.title }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: firstPhoto.alt })).toBeInTheDocument()
    expect(within(dialog).getByText(`Formato: ${firstPhoto.format}`)).toBeInTheDocument()
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Siguiente' }))
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', {
        level: 2,
        name: nextPhoto.title,
      }),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(nextTrigger).toHaveFocus()
  })

  test('provides an album link beside the album heading', () => {
    renderSection(withSubAlbums)

    expect(screen.getByRole('link', { name: /Ver álbum/ })).toHaveAttribute(
      'href',
      `/galeria/${withSubAlbums.album.slug}`,
    )
  })

  test('shows parent-album photos first and fills up to ten from sub-albums', () => {
    const { album } = withSubAlbums
    const parentPhoto = firstItem(album.media)
    const subAlbum = firstItem(album.subAlbums)
    const subAlbumPhoto = firstItem(subAlbum.media)
    const parentPhotos = Array.from({ length: 8 }, (_, index) => ({
      ...parentPhoto,
      id: `parent-${index}`,
      title: `Parent photo ${index}`,
    }))
    const subAlbumPhotos = Array.from({ length: 3 }, (_, index) => ({
      ...subAlbumPhoto,
      id: `sub-${index}`,
      title: `Sub-album photo ${index}`,
    }))
    const skippedSubAlbumPhotos = Array.from({ length: 2 }, (_, index) => ({
      ...subAlbumPhoto,
      id: `later-${index}`,
      title: `Later sub-album photo ${index}`,
    }))
    const video: GalleryMedia = {
      ...parentPhoto,
      id: 'parent-video',
      title: 'A video',
      isVideo: true,
    }
    const pendingImage: GalleryMedia = {
      ...parentPhoto,
      id: 'pending-image',
      title: 'An image without a source',
      src: undefined,
    }

    renderSection({
      album: {
        ...album,
        media: [...parentPhotos, video, pendingImage],
        subAlbums: [
          { ...subAlbum, media: subAlbumPhotos },
          { ...subAlbum, slug: 'later', media: skippedSubAlbumPhotos },
        ],
      },
    })

    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.getAllByRole('button', { name: /Ver imagen a pantalla completa:/ })).toHaveLength(
      10,
    )
    expect(
      screen.getByRole('button', { name: 'Ver imagen a pantalla completa: Parent photo 0' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ver imagen a pantalla completa: Sub-album photo 0' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Ver imagen a pantalla completa: Later sub-album photo 0',
      }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('A video')).not.toBeInTheDocument()
    expect(screen.queryByText('An image without a source')).not.toBeInTheDocument()
  })

  test('shows no album tiles when no photos are available', () => {
    const { album } = withSubAlbums
    renderSection({
      album: {
        ...album,
        media: [],
        subAlbums: album.subAlbums.map((item) => ({ ...item, media: [] })),
      },
    })

    const track = screen.getByRole('list', { name: album.title })
    expect(track).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Imágenes anteriores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Imágenes siguientes' })).not.toBeInTheDocument()
  })

  test('exposes the scroll track to the keyboard and scrolls by about one card', async () => {
    const user = userEvent.setup()
    renderSection(withSubAlbums)

    const track = screen.getByRole('list', { name: withSubAlbums.album.title })
    expect(track).toHaveAttribute('tabindex', '0')

    const scrollBy = vi.fn()
    Object.defineProperty(track, 'scrollBy', { value: scrollBy, writable: true })
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 600 })

    await user.click(screen.getByRole('button', { name: 'Imágenes siguientes' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: 360 })

    await user.click(screen.getByRole('button', { name: 'Imágenes anteriores' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: -360 })
  })

  test('renders a full-screen image control when there are no sub-albums', () => {
    renderSection(withoutSubAlbums)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Ver álbum/ })).toHaveAttribute(
      'href',
      `/galeria/${withoutSubAlbums.album.slug}`,
    )
    const photoButton = screen.getByRole('button', {
      name: 'Ver imagen a pantalla completa: Montaje de la antena',
    })
    expect(photoButton.querySelector('img')).toBeInTheDocument()
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
          subAlbums: album.subAlbums.map((subAlbum) => ({ ...subAlbum, id: 'sub-album-id' })),
        },
        canDelete: true,
        canEdit: true,
      },
      true,
    )

    const track = screen.getByRole('list', { name: album.title })
    const title = screen.getByRole('heading', { level: 2, name: album.title })
    expect(title.parentElement).toHaveClass('gallery-group-title-editable')
    expect(track).not.toHaveClass('editable')
    const featuredCount = Math.min(
      album.media.filter((media) => !media.isVideo && media.src).length +
        album.subAlbums.reduce(
          (total, subAlbum) =>
            total + subAlbum.media.filter((media) => !media.isVideo && media.src).length,
          0,
        ),
      withSubAlbums.featuredImageLimit ?? 10,
    )
    expect(within(track).getAllByRole('listitem')).toHaveLength(featuredCount)
    expect(
      within(track).getAllByRole('button', { name: /Ver imagen a pantalla completa:/ }),
    ).toHaveLength(featuredCount)
    expect(screen.getByRole('button', { name: `Editar ${album.title}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Eliminar ${album.title}` })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir subálbum' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Editar ${firstItem(album.subAlbums).title}` }),
    ).not.toBeInTheDocument()
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
