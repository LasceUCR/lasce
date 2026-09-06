import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryGroupSection, type GalleryGroupSectionProps } from './GalleryGroupSection'
import { WithoutSubAlbums, WithSubAlbums } from './GalleryGroupSection.stories'
import { albumMeta } from '@/app/lib/gallery'

const withSubAlbums = WithSubAlbums.args as GalleryGroupSectionProps
const withoutSubAlbums = WithoutSubAlbums.args as GalleryGroupSectionProps

describe('GalleryGroupSection', () => {
  test('names the album and summarises what it holds', () => {
    const { album } = withSubAlbums
    render(<GalleryGroupSection {...withSubAlbums} />)

    expect(screen.getByRole('heading', { level: 2, name: album.title })).toBeInTheDocument()
    expect(screen.getByText(album.description)).toBeInTheDocument()
    expect(screen.getAllByText(albumMeta(album)).length).toBeGreaterThan(0)
  })

  test('links the cover to the album and every sub-album to its own page', () => {
    const { album } = withSubAlbums
    render(<GalleryGroupSection {...withSubAlbums} />)

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
    render(<GalleryGroupSection {...withSubAlbums} />)

    // Two sub-albums hold the same number of files, so match on the tile
    // rather than on the count alone.
    for (const subAlbum of album.subAlbums) {
      const tile = screen.getByRole('link', { name: new RegExp(subAlbum.title) })

      expect(tile).toHaveTextContent(`${subAlbum.media.length} archivos`)
    }
  })

  test('renders the cover on its own when the album has no sub-albums', () => {
    render(<GalleryGroupSection {...withoutSubAlbums} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText(/^\d+ archivos$/)).not.toBeInTheDocument()
  })
})
