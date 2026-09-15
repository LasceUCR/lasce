import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AlbumTile, type AlbumTileProps } from './AlbumTile'
import { Cover, CoverWithoutLink, SubAlbum } from './AlbumTile.stories'

const coverArgs = Cover.args as AlbumTileProps
const staticArgs = CoverWithoutLink.args as AlbumTileProps
const subArgs = SubAlbum.args as AlbumTileProps

describe('AlbumTile', () => {
  test('links to the album when it has a page of its own', () => {
    render(<AlbumTile {...coverArgs} />)

    const link = screen.getByRole('link', {
      name: `${coverArgs.title} ${coverArgs.meta}`,
    })

    expect(link).toHaveAttribute('href', '/galeria/rosac')
    expect(screen.getByText(coverArgs.meta)).toBeInTheDocument()
  })

  test('stays a plain tile when there is no album page', () => {
    render(<AlbumTile {...staticArgs} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(staticArgs.title)).toBeInTheDocument()
  })

  test('announces the sub-album file count', () => {
    render(<AlbumTile {...subArgs} />)

    expect(screen.getByText('8 archivos')).toBeInTheDocument()
  })

  test('titles the tile as a heading below the album it sits under', () => {
    render(<AlbumTile {...coverArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: coverArgs.title })).toBeInTheDocument()
  })

  // The link already carries the title and the meta line, so describing the
  // cover as well would only repeat them.
  test('keeps the cover out of the accessibility tree', () => {
    render(<AlbumTile {...subArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
