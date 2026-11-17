import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AlbumPageSkeleton, type AlbumPageSkeletonProps } from './AlbumPageSkeleton'
import meta from './AlbumPageSkeleton.stories'

const args = meta.args as AlbumPageSkeletonProps

describe('AlbumPageSkeleton', () => {
  test('announces the load and shows the fixed kicker and section titles straight away', () => {
    render(<AlbumPageSkeleton {...args} />)

    expect(screen.getByRole('status')).toHaveTextContent(args.label)
    expect(screen.getByText(args.kicker)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: args.subalbumsTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: args.mediaTitle })).toBeInTheDocument()
  })

  test('omits the sub-album section for a sub-album page, which never has children', () => {
    render(<AlbumPageSkeleton {...args} hasSubAlbums={false} />)

    expect(screen.queryByRole('heading', { name: args.subalbumsTitle })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: args.mediaTitle })).toBeInTheDocument()
  })

  test('has nothing in the placeholders that can take focus', () => {
    const { container } = render(<AlbumPageSkeleton {...args} />)

    expect(container.querySelectorAll('.gallery-tile, .media-tile').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders every string from props, not a fixed language', () => {
    render(
      <AlbumPageSkeleton
        kicker="LASCE Gallery"
        label="Loading album…"
        mediaTitle="Photographs and video of this album"
        subalbumsTitle="Subalbums"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading album…')
    expect(screen.getByText('LASCE Gallery')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Subalbums' })).toBeInTheDocument()
  })
})
