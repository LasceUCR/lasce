import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { StatCard, type StatCardProps } from './StatCard'
import { AsLink, Default, Empty } from './StatCard.stories'

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

  test('is not a link unless it is given a destination', () => {
    render(<StatCard {...defaultArgs} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('links the whole card when it is given a destination', () => {
    const args = AsLink.args as StatCardProps
    render(<StatCard {...args} />)

    const link = screen.getByRole('link', { name: `${args.label} ${args.value}` })
    expect(link).toHaveAttribute('href', args.href)
  })

  test('marks a no-data message so it is not styled as a figure', () => {
    const args = Empty.args as StatCardProps
    const { container } = render(<StatCard {...args} />)

    expect(screen.getByText('Sin registros')).toBeInTheDocument()
    expect(container.querySelector('.indicator-empty')).toBeInTheDocument()
  })
})
