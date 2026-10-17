import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { AlbumPage, type AlbumPageProps } from './AlbumPage'
import { albumMediaMeta, albumMeta, galleryAlbums } from '@/app/lib/gallery'

vi.mock('@lasce/db', () => ({ prisma: {} }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(public)/galeria/actions', () => ({ uploadGalleryImage: vi.fn() }))

function render(ui: ReactElement, editMode = false) {
  return renderWithIntl(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => undefined }}>
      <ToastProvider>{ui}</ToastProvider>
    </EditModeContext.Provider>,
  )
}

const album = galleryAlbums.rosac
const [subAlbum] = album.subAlbums

const albumArgs: AlbumPageProps = {
  title: album.title,
  description: album.description,
  meta: albumMeta(album),
  media: album.media,
  subAlbums: album.subAlbums,
  parentSlug: album.slug,
}

describe('AlbumPage', () => {
  test('names the album and summarises what it holds', () => {
    render(<AlbumPage {...albumArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: album.title })).toBeInTheDocument()
    expect(screen.getByText(album.description)).toBeInTheDocument()
    expect(screen.getByText(albumMeta(album))).toBeInTheDocument()
    expect(screen.getByText(albumMediaMeta(album.media))).toBeInTheDocument()
  })

  test('lists the sub-albums as links and one control per file', () => {
    render(<AlbumPage {...albumArgs} />)

    expect(screen.getByRole('heading', { name: 'Subálbumes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(subAlbum?.title ?? '') })).toHaveAttribute(
      'href',
      `/galeria/rosac/${subAlbum?.slug}`,
    )
    expect(screen.getAllByRole('button', { name: /^Ver a tamaño completo:/ })).toHaveLength(
      album.media.length,
    )
  })

  test('presents the sub-albums and the files as lists', () => {
    render(<AlbumPage {...albumArgs} />)

    const [subAlbumList, mediaList] = screen.getAllByRole('list')

    expect(subAlbumList?.children).toHaveLength(album.subAlbums.length)
    expect(mediaList?.children).toHaveLength(album.media.length)
  })

  test('keeps the sub-album tiles one level under the Subálbumes heading', () => {
    render(<AlbumPage {...albumArgs} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Subálbumes' })).toBeInTheDocument()

    for (const child of album.subAlbums) {
      expect(screen.getByRole('heading', { level: 3, name: child.title })).toBeInTheDocument()
    }
  })

  test('leaves out the sub-album section on a page that has none', () => {
    render(<AlbumPage {...albumArgs} subAlbums={[]} />)

    expect(screen.queryByRole('heading', { name: 'Subálbumes' })).not.toBeInTheDocument()
  })

  test('returns to the gallery index by default from the bottom of the page', () => {
    render(<AlbumPage {...albumArgs} />)

    const backLink = screen.getByRole('link', { name: 'Volver a la galería' })
    const heading = screen.getByRole('heading', { level: 1, name: album.title })

    expect(backLink).toHaveAttribute('href', '/galeria')
    expect(
      Boolean(heading.compareDocumentPosition(backLink) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })

  test('returns to the parent album when a sub-album page overrides the back link', () => {
    render(
      <AlbumPage
        {...albumArgs}
        backHref="/galeria/rosac"
        backLabel="Volver a Fotos del ROSAC"
        subAlbums={[]}
      />,
    )

    const backLink = screen.getByRole('link', { name: 'Volver a Fotos del ROSAC' })
    const heading = screen.getByRole('heading', { level: 1, name: album.title })

    expect(backLink).toHaveAttribute('href', '/galeria/rosac')
    expect(
      Boolean(heading.compareDocumentPosition(backLink) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })

  test('displays no full-size buttons when an album has no media', () => {
    render(<AlbumPage {...albumArgs} media={[]} />)

    expect(
      screen.queryByRole('button', { name: /^Ver a tamaño completo:/ }),
    ).not.toBeInTheDocument()
  })

  test('asks before Escape discards a new sub-album', async () => {
    const user = userEvent.setup()
    render(<AlbumPage {...albumArgs} canCreate parentAlbumId="parent-id" />, true)

    await user.click(screen.getByRole('button', { name: 'Añadir subálbum' }))
    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), 'Nuevo')
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('dialog', { name: 'Añadir subálbum' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue('Nuevo')
  })

  test('reports a title without letters or numbers next to the title field', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())
    render(<AlbumPage {...albumArgs} canCreate parentAlbumId="parent-id" />, true)

    await user.click(screen.getByRole('button', { name: 'Añadir subálbum' }))
    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), '!!!')
    await user.type(screen.getByRole('textbox', { name: 'Descripción (Español)' }), 'Texto')
    await user.click(screen.getByRole('tab', { name: 'English' }))
    await user.type(screen.getByRole('textbox', { name: 'Título (English)' }), 'New')
    await user.type(screen.getByRole('textbox', { name: 'Descripción (English)' }), 'Text')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      screen.getByText('El título debe incluir letras o números para generar el identificador.'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
