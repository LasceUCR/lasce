import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { WorkAreaCard, type WorkAreaCardProps } from './WorkAreaCard'
import { Default, LongDescription } from './WorkAreaCard.stories'

// The stories are the fixtures: a state worth documenting in Storybook is a
// state worth asserting here, and reusing the args keeps the two from drifting.
const defaultArgs = Default.args as WorkAreaCardProps
const longDescriptionArgs = LongDescription.args as WorkAreaCardProps

describe('WorkAreaCard', () => {
  test('links to the area it describes', () => {
    render(<WorkAreaCard {...defaultArgs} />)

    expect(screen.getByRole('link')).toHaveAttribute('href', defaultArgs.href)
  })

  test('shows the title and description it was given', () => {
    render(<WorkAreaCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.title)).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.description)).toBeInTheDocument()
  })

  test('renders the long description state without truncating it', () => {
    render(<WorkAreaCard {...longDescriptionArgs} />)

    expect(screen.getByText(longDescriptionArgs.description)).toBeInTheDocument()
  })

  test('keeps the decorative icon and arrow out of the accessibility tree', () => {
    const { container } = render(<WorkAreaCard {...defaultArgs} />)
    const link = screen.getByRole('link')

    // Neither carries meaning the title does not already convey, so an
    // `aria-hidden` subtree is excluded from the computed accessible name.
    expect(container.querySelector('.area-icon')).toHaveAttribute('aria-hidden', 'true')
    expect(link).toHaveAccessibleName(/Ver sección/)
    expect(link).not.toHaveAccessibleName(/→/)
  })
})
