import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

const messages = vi.hoisted(() => ({
  hero: {
    kicker: 'Portal público LASCE',
    title: 'Galería',
    lead: 'Fotografías y video de las actividades del laboratorio: construcción e instrumentación, observación y vida cotidiana del equipo. Organizada por álbumes.',
  },
  common: { backToHome: 'Volver al inicio' },
}))

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: 'gallery.hero' | 'common') => {
    if (namespace === 'gallery.hero') {
      return (key: 'kicker' | 'title' | 'lead') => messages.hero[key]
    }

    return (key: 'backToHome') => messages.common[key]
  },
}))

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

async function renderGalleryPage() {
  const page = await GalleryPage({ albums: galleryAlbumList })
  render(page)
}

describe('GalleryPage', () => {
  test('introduces the gallery and lists every album', async () => {
    await renderGalleryPage()

    expect(screen.getByRole('heading', { level: 1, name: galeriaHero.title })).toBeInTheDocument()
    expect(screen.getByText(galeriaHero.lead)).toBeInTheDocument()

    for (const album of galleryAlbumList) {
      expect(screen.getByRole('heading', { level: 2, name: album.title })).toBeInTheDocument()
    }
  })

  test('links each album to its detail page', async () => {
    await renderGalleryPage()

    for (const album of galleryAlbumList) {
      const section = screen.getByRole('region', { name: album.title })
      expect(within(section).getByRole('link', { name: 'Ver álbum completo' })).toHaveAttribute(
        'href',
        `/galeria/${album.slug}`,
      )
    }
  })

  test('shows up to ten photos from each album and its sub-albums', async () => {
    await renderGalleryPage()

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

  test('presents each album block as its own list', async () => {
    await renderGalleryPage()

    expect(screen.getAllByRole('list')).toHaveLength(galleryAlbumList.length)
  })

  test('offers a way back to the home page at the bottom of the page', async () => {
    await renderGalleryPage()

    const backLink = screen.getByRole('link', { name: 'Volver al inicio' })
    const heading = screen.getByRole('heading', { level: 1, name: galeriaHero.title })

    expect(backLink).toHaveAttribute('href', '/')
    expect(
      Boolean(heading.compareDocumentPosition(backLink) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })
})
