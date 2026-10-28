import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { MediaTileSkeleton } from './MediaTileSkeleton'

describe('MediaTileSkeleton', () => {
  test('stands in for one media tile, hidden from assistive technology', () => {
    const { container } = render(<MediaTileSkeleton />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild?.tagName).toBe('LI')
    expect(container.firstElementChild).toHaveClass('media-tile')
    expect(container).toHaveTextContent('')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })
})
