import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryPage } from './GalleryPage'
import { galeriaHero, galleryGroups } from '@/app/lib/gallery'

describe('GalleryPage', () => {
  test('introduces the gallery and lists every group', () => {
    render(<GalleryPage />)

    expect(screen.getByRole('heading', { level: 1, name: galeriaHero.title })).toBeInTheDocument()
    expect(screen.getByText(galeriaHero.lead)).toBeInTheDocument()

    for (const group of galleryGroups) {
      expect(screen.getByRole('heading', { level: 2, name: group.title })).toBeInTheDocument()
    }
  })

  test('links only the groups that have an album page', () => {
    render(<GalleryPage />)

    expect(screen.getByRole('link', { name: /Construcción del ROSAC/ })).toHaveAttribute(
      'href',
      '/galeria/rosac',
    )
    expect(screen.queryByRole('link', { name: /Eclipse solar/ })).not.toBeInTheDocument()
  })

  test('offers a way back to the home page', () => {
    render(<GalleryPage />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
