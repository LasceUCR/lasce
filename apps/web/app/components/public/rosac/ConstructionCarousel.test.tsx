import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { rosacConstructionContent } from '@/app/lib/rosac-construction'

import { ConstructionCarousel } from './ConstructionCarousel'

// The carousel interaction itself (looping, group boundaries, keyboard,
// live-region announcements, absence of autoplay, ...) is covered once on
// the shared component in Carousel.test.tsx. This only checks that the
// ROSAC wrapper wires the real construction data and label into it.
describe('ConstructionCarousel', () => {
  test('renders the ROSAC construction stages inside a carousel labeled for this page', () => {
    const stages = rosacConstructionContent.stages
    render(<ConstructionCarousel stages={stages} />)

    expect(
      screen.getByRole('group', { name: 'Proceso de construcción del ROSAC' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: stages[0].title })).toBeInTheDocument()
    expect(screen.getByText(stages[0].description)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: stages[0].images[0].alt })).toHaveAttribute(
      'src',
      stages[0].images[0].src,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      `Etapa 1 de ${stages.length}: ${stages[0].title}. Fotografía 1 de ${stages[0].images.length}.`,
    )
  })
})
