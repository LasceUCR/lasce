import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { GalleryPage } from './GalleryPage'
import { galeriaHero, galleryAlbumList } from '@/app/lib/gallery'

vi.mock('@lasce/db', () => ({ prisma: {} }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(public)/galeria/actions', () => ({ uploadGalleryImage: vi.fn() }))

function render(ui: ReactElement) {
  return renderWithIntl(
    <EditModeContext.Provider value={{ editMode: false, setEditMode: () => undefined }}>
      <ToastProvider>{ui}</ToastProvider>
    </EditModeContext.Provider>,
  )
}

describe('GalleryPage', () => {
  test('introduces the gallery and lists every album', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    expect(screen.getByRole('heading', { level: 1, name: galeriaHero.title })).toBeInTheDocument()
    expect(screen.getByText(galeriaHero.lead)).toBeInTheDocument()

    for (const album of galleryAlbumList) {
      expect(screen.getByRole('heading', { level: 2, name: album.title })).toBeInTheDocument()
    }
  })

  test('links each album to its detail page', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    for (const album of galleryAlbumList) {
      const section = screen.getByRole('region', { name: album.title })
      expect(within(section).getByRole('link', { name: 'Ver álbum completo' })).toHaveAttribute(
        'href',
        `/galeria/${album.slug}`,
      )
    }
  })

  test('shows up to ten photos from each album and its sub-albums', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    for (const album of galleryAlbumList) {
      const section = screen.getByRole('region', { name: album.title })
      const expectedMedia = [
        ...album.media,
        ...album.subAlbums.flatMap((subAlbum) => subAlbum.media),
      ].filter((media) => !media.isVideo && media.src)
      expect(
        within(section).getAllByRole('button', { name: /^Ver imagen a pantalla completa:/ }),
      ).toHaveLength(Math.min(expectedMedia.length, 10))
    }
  })

  test('presents each album block as its own list', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    expect(screen.getAllByRole('list')).toHaveLength(galleryAlbumList.length)
  })

  test('offers a way back to the home page at the bottom of the page', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    const backLink = screen.getByRole('link', { name: 'Volver al inicio' })
    const heading = screen.getByRole('heading', { level: 1, name: galeriaHero.title })

    expect(backLink).toHaveAttribute('href', '/')
    expect(
      Boolean(heading.compareDocumentPosition(backLink) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })
})
