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

    expect(screen.getByRole('link', { name: /Construcción del ROSAC/ })).toHaveAttribute(
      'href',
      '/galeria/rosac',
    )
    expect(screen.getByText(coverArgs.meta)).toBeInTheDocument()
  })

  test('stays a plain tile when there is no album page', () => {
    render(<AlbumTile {...staticArgs} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(staticArgs.title)).toBeInTheDocument()
  })

  test('announces the sub-album file count', () => {
    render(<AlbumTile {...subArgs} />)

    expect(screen.getByText('18 archivos')).toBeInTheDocument()
    expect(screen.getByText('Portada del subálbum')).toBeInTheDocument()
  })
})
