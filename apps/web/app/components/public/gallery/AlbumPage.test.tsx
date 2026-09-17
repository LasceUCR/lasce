import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AlbumPage, type AlbumPageProps } from './AlbumPage'
import { albumMediaMeta, albumMeta, galleryAlbums } from '@/app/lib/gallery'

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

  test('returns to the gallery index by default', () => {
    render(<AlbumPage {...albumArgs} />)

    expect(screen.getByRole('link', { name: 'Volver a la galería' })).toHaveAttribute(
      'href',
      '/galeria',
    )
  })

  test('returns to the parent album when a sub-album page overrides the back link', () => {
    render(
      <AlbumPage
        {...albumArgs}
        backHref="/galeria/rosac"
        backLabel="Volver a Construcción del ROSAC"
        subAlbums={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Volver a Construcción del ROSAC' })).toHaveAttribute(
      'href',
      '/galeria/rosac',
    )
  })
})
