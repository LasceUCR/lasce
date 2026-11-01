import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AlbumPageSkeleton } from './AlbumPageSkeleton'

describe('AlbumPageSkeleton', () => {
  test('announces the load and shows the fixed kicker and section titles straight away', () => {
    render(<AlbumPageSkeleton />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando álbum…')
    expect(screen.getByText('Galería LASCE')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Subálbumes' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fotografías y video de este álbum' }),
    ).toBeInTheDocument()
  })

  test('omits the sub-album section for a sub-album page, which never has children', () => {
    render(<AlbumPageSkeleton hasSubAlbums={false} />)

    expect(screen.queryByRole('heading', { name: 'Subálbumes' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fotografías y video de este álbum' }),
    ).toBeInTheDocument()
  })

  test('has nothing in the placeholders that can take focus', () => {
    const { container } = render(<AlbumPageSkeleton />)

    expect(container.querySelectorAll('.gallery-tile, .media-tile').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
