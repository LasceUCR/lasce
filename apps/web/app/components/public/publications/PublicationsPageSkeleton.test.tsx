import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { PAGE_SIZE } from '@/app/lib/pagination'

import {
  PublicationsPageSkeleton,
  type PublicationsPageSkeletonProps,
} from './PublicationsPageSkeleton'
import meta from './PublicationsPageSkeleton.stories'

const args = meta.args as PublicationsPageSkeletonProps

describe('PublicationsPageSkeleton', () => {
  test('shows the catalogue copy straight away and one page of card placeholders', () => {
    const { container } = render(<PublicationsPageSkeleton {...args} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Publicaciones científicas' }),
    ).toBeInTheDocument()
    expect(screen.getByText(args.lead)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Publicaciones recientes' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.publication-card')).toHaveLength(PAGE_SIZE)
  })

  test('announces the load and keeps the placeholders out of the tab order', () => {
    render(<PublicationsPageSkeleton {...args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando publicaciones…')
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  test('follows the language of the copy it is given', () => {
    render(
      <PublicationsPageSkeleton
        backLabel="Back to home"
        kicker="LASCE public portal"
        label="Loading publications…"
        lead="Scientific publications and contributions from LASCE and ROSAC."
        listTitle="Recent publications"
        title="Scientific publications"
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scientific publications' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent publications' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading publications…')
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
