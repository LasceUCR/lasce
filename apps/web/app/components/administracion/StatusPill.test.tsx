import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { StatusPill, type StatusPillProps } from './StatusPill'
import { TextOnly, WithDot } from './StatusPill.stories'

const dotArgs = WithDot.args as StatusPillProps
const textOnlyArgs = TextOnly.args as StatusPillProps

describe('StatusPill', () => {
  test('shows a dot alongside the label by default', () => {
    const { container } = render(<StatusPill {...dotArgs} />)

    expect(screen.getByText(dotArgs.label)).toBeInTheDocument()
    expect(container.querySelector('.status-pill-dot')).toBeInTheDocument()
  })

  test('hides the dot when showDot is false', () => {
    const { container } = render(<StatusPill {...textOnlyArgs} />)

    expect(screen.getByText(textOnlyArgs.label)).toBeInTheDocument()
    expect(container.querySelector('.status-pill-dot')).not.toBeInTheDocument()
  })

  test('applies the tone as a class for coloring', () => {
    const { container } = render(<StatusPill {...dotArgs} />)

    expect(container.querySelector(`.status-pill-${dotArgs.tone}`)).toBeInTheDocument()
  })
})
