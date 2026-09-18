import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SpaceBackdrop } from './SpaceBackdrop'

describe('SpaceBackdrop', () => {
  test('renders the scene as a decorative image outside the accessibility tree', () => {
    const { container } = render(<SpaceBackdrop />)

    const wrapper = container.querySelector('.space-page-bg')
    const image = container.querySelector('img')

    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('src', '/images/decorative/acceso-bg.jpg')
  })
})
