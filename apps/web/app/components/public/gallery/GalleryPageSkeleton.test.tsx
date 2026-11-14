import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryPageSkeleton, type GalleryPageSkeletonProps } from './GalleryPageSkeleton'
import meta from './GalleryPageSkeleton.stories'

const args = meta.args as GalleryPageSkeletonProps

describe('GalleryPageSkeleton', () => {
  test('shows the real hero and back link straight away, since neither is database content', () => {
    render(<GalleryPageSkeleton {...args} />)

    expect(screen.getByRole('heading', { level: 1, name: args.title })).toBeInTheDocument()
    expect(screen.getByText(args.lead)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: args.backLabel })).toHaveAttribute('href', '/')
  })

  test('announces the load and hides the album placeholders from assistive technology', () => {
    const { container } = render(<GalleryPageSkeleton {...args} />)

    expect(screen.getByRole('status')).toHaveTextContent(args.label)
    expect(container.querySelector('.gallery-groups')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('.gallery-tile').length).toBeGreaterThan(0)
  })

  test('has nothing in the album placeholders that can take focus', () => {
    render(<GalleryPageSkeleton {...args} />)

    expect(screen.queryAllByRole('link')).toHaveLength(1) // only the back link
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders every string from props, not a fixed language', () => {
    render(
      <GalleryPageSkeleton
        backLabel="Back to home"
        kicker="LASCE public portal"
        label="Loading gallery…"
        lead="Photographs and video of the laboratory's activities."
        title="Gallery"
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Gallery' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading gallery…')
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument()
  })
})
