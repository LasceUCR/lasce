import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { StatCard, type StatCardProps } from './StatCard'
import { Default } from './StatCard.stories'

const defaultArgs = Default.args as StatCardProps

describe('StatCard', () => {
  test('shows the label and value it was given', () => {
    render(<StatCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.label)).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.value)).toBeInTheDocument()
  })

  test('applies the tone as a class for the accent bar', () => {
    const { container } = render(<StatCard {...defaultArgs} />)

    expect(container.querySelector(`.indicator-${defaultArgs.tone}`)).toBeInTheDocument()
  })
})
