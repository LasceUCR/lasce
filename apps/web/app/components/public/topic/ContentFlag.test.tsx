import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ContentFlag, type ContentFlagProps } from './ContentFlag'
import { Default } from './ContentFlag.stories'

const defaultArgs = Default.args as ContentFlagProps

describe('ContentFlag', () => {
  test('announces itself as a complementary region named by its label', () => {
    render(<ContentFlag {...defaultArgs} />)

    const region = screen.getByRole('complementary', { name: defaultArgs.label })

    expect(region).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.message)).toBeInTheDocument()
  })

  test('keeps the decorative flag icon out of the accessibility tree', () => {
    const { container } = render(<ContentFlag {...defaultArgs} />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
