import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ConceptFlow, type ConceptFlowProps } from './ConceptFlow'
import { Default } from './ConceptFlow.stories'

const defaultArgs = Default.args as ConceptFlowProps

describe('ConceptFlow', () => {
  test('lists every step in order and names the region with its title', () => {
    render(<ConceptFlow {...defaultArgs} />)

    const region = screen.getByRole('group', { name: defaultArgs.title })
    const steps = within(region).getAllByRole('listitem')

    expect(steps).toHaveLength(defaultArgs.steps.length)
    defaultArgs.steps.forEach((step, index) => {
      expect(steps[index]).toHaveTextContent(step)
    })
    expect(screen.getByText(defaultArgs.caption)).toBeInTheDocument()
  })

  test('keeps the arrows between steps decorative', () => {
    const { container } = render(<ConceptFlow {...defaultArgs} />)

    expect(container.querySelectorAll('.concept-flow-arrow')).toHaveLength(
      defaultArgs.steps.length - 1,
    )
    container.querySelectorAll('.concept-flow-arrow').forEach((arrow) => {
      expect(arrow).toHaveAttribute('aria-hidden', 'true')
    })
  })

  test('renders only the linked steps as links', () => {
    render(<ConceptFlow {...defaultArgs} stepLinks={[null, null, '/clima-espacial', '/datos']} />)

    expect(screen.getByRole('link', { name: defaultArgs.steps[2] })).toHaveAttribute(
      'href',
      '/clima-espacial',
    )
    expect(screen.getByRole('link', { name: defaultArgs.steps[3] })).toHaveAttribute(
      'href',
      '/datos',
    )
    expect(screen.queryByRole('link', { name: defaultArgs.steps[0] })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: defaultArgs.steps[1] })).not.toBeInTheDocument()
  })
})
