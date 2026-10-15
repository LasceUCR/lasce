import { screen } from '@testing-library/react'
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

  test('links every album and every sub-album to a page of its own', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    for (const album of galleryAlbumList) {
      expect(screen.getByRole('link', { name: new RegExp(album.title) })).toHaveAttribute(
        'href',
        `/galeria/${album.slug}`,
      )

      for (const subAlbum of album.subAlbums) {
        expect(screen.getByRole('link', { name: new RegExp(subAlbum.title) })).toHaveAttribute(
          'href',
          `/galeria/${album.slug}/${subAlbum.slug}`,
        )
      }
    }
  })

  // Every album is an h2 and every tile beneath it an h3, so the outline never
  // skips a level and can be used to move around the page.
  test('nests every tile heading under the heading of its album', () => {
    render(<GalleryPage albums={galleryAlbumList} />)

    const expected = galleryAlbumList.flatMap((album) => [
      album.title,
      ...album.subAlbums.map((subAlbum) => subAlbum.title),
    ])

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(expected.length)
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
