import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { galeriaHero } from '@/app/lib/gallery-content'

import { GalleryPageSkeleton } from './GalleryPageSkeleton'

describe('GalleryPageSkeleton', () => {
  test('shows the real hero and back link straight away, since neither is database content', () => {
    render(<GalleryPageSkeleton />)

    expect(screen.getByRole('heading', { level: 1, name: galeriaHero.title })).toBeInTheDocument()
    expect(screen.getByText(galeriaHero.lead)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('announces the load and hides the album placeholders from assistive technology', () => {
    const { container } = render(<GalleryPageSkeleton />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando galería…')
    expect(container.querySelector('.gallery-groups')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('.gallery-tile').length).toBeGreaterThan(0)
  })

  test('has nothing in the album placeholders that can take focus', () => {
    render(<GalleryPageSkeleton />)

    expect(screen.queryAllByRole('link')).toHaveLength(1) // only "Volver al inicio"
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
