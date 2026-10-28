import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { GalleryTileSkeleton } from './GalleryTileSkeleton'
import { Cover, SubAlbum } from './GalleryTileSkeleton.stories'

describe('GalleryTileSkeleton', () => {
  test('stands in for an album tile, hidden from assistive technology', () => {
    const { container } = render(<GalleryTileSkeleton {...SubAlbum.args} />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('gallery-tile', 'gallery-tile-sub')
    expect(container).toHaveTextContent('')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })

  test('marks the cover variant for the album-of-groups tile', () => {
    const { container } = render(<GalleryTileSkeleton {...Cover.args} />)

    expect(container.firstElementChild).toHaveClass('gallery-tile-cover')
  })
})
