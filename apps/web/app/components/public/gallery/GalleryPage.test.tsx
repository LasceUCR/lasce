import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryPage } from './GalleryPage'
import { galeriaHero, galleryAlbumList } from '@/app/lib/gallery'

describe('GalleryPage', () => {
  test('introduces the gallery and lists every album', () => {
    render(<GalleryPage />)

    expect(screen.getByRole('heading', { level: 1, name: galeriaHero.title })).toBeInTheDocument()
    expect(screen.getByText(galeriaHero.lead)).toBeInTheDocument()

    for (const album of galleryAlbumList) {
      expect(screen.getByRole('heading', { level: 2, name: album.title })).toBeInTheDocument()
    }
  })

  test('links every album and every sub-album to a page of its own', () => {
    render(<GalleryPage />)

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

  test('offers a way back to the home page', () => {
    render(<GalleryPage />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
