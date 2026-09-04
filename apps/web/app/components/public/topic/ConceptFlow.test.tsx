import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ConceptFlow, type ConceptFlowProps } from './ConceptFlow'
import { Default } from './ConceptFlow.stories'

const defaultArgs = Default.args as ConceptFlowProps

describe('ConceptFlow', () => {
  test('lists every step in order and names the region with its title', () => {
    render(<ConceptFlow {...defaultArgs} />)

    const region = screen.getByLabelText(defaultArgs.title)
    const steps = within(region).getAllByRole('listitem')

    expect(steps).toHaveLength(defaultArgs.steps.length)
    defaultArgs.steps.forEach((step, index) => {
      expect(steps[index]).toHaveTextContent(step)
    })
    expect(screen.getByText(defaultArgs.caption)).toBeInTheDocument()
  })

  test('keeps the arrows between steps decorative', () => {
    const { container } = render(<ConceptFlow {...defaultArgs} />)

    expect(container.querySelectorAll('.concept-flow-arrow')).toHaveLength(defaultArgs.steps.length - 1)
    container.querySelectorAll('.concept-flow-arrow').forEach((arrow) => {
      expect(arrow).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
