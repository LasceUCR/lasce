import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AlbumPage } from './AlbumPage'
import { galleryAlbums, type GalleryAlbum } from '@/app/lib/gallery'

const album = galleryAlbums.rosac

describe('AlbumPage', () => {
  test('names the album and summarises what it holds', () => {
    render(<AlbumPage album={album} />)

    expect(screen.getByRole('heading', { level: 1, name: album.title })).toBeInTheDocument()
    expect(screen.getByText(album.description)).toBeInTheDocument()
    expect(screen.getByText(album.meta)).toBeInTheDocument()
    expect(screen.getByText('13 archivos en este álbum')).toBeInTheDocument()
  })

  test('lists the sub-albums and one control per file', () => {
    render(<AlbumPage album={album} />)

    expect(screen.getByRole('heading', { name: 'Subálbumes' })).toBeInTheDocument()
    expect(screen.getByText('Cimentación e instalación de la antena')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver a tamaño completo:/ })).toHaveLength(
      album.media.length,
    )
  })

  test('leaves out the sub-album section when the album has none', () => {
    const withoutSubAlbums: GalleryAlbum = { ...album, subAlbums: [] }
    render(<AlbumPage album={withoutSubAlbums} />)

    expect(screen.queryByRole('heading', { name: 'Subálbumes' })).not.toBeInTheDocument()
  })

  test('offers a way back to the gallery index', () => {
    render(<AlbumPage album={album} />)

    expect(screen.getByRole('link', { name: 'Volver a la galería' })).toHaveAttribute(
      'href',
      '/galeria',
    )
  })
})
