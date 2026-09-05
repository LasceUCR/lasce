import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { WorkAreasSection, type WorkAreasSectionProps } from './WorkAreasSection'
import { Default, Empty } from './WorkAreasSection.stories'

const defaultArgs = Default.args as WorkAreasSectionProps
const emptyArgs = Empty.args as WorkAreasSectionProps

describe('WorkAreasSection', () => {
  test('renders one card per area it is given', () => {
    render(<WorkAreasSection {...defaultArgs} />)

    const region = screen.getByRole('region', { name: defaultArgs.title })
    expect(within(region).getAllByRole('link')).toHaveLength(defaultArgs.areas.length)
  })

  test('renders each area title and links it to its own page', () => {
    render(<WorkAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      expect(screen.getByText(area.title)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: new RegExp(area.title) })).toHaveAttribute(
        'href',
        area.href,
      )
    }
  })

  test('still renders its heading when there are no areas', () => {
    render(<WorkAreasSection {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: emptyArgs.title })).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  test('labels the section with its own heading', () => {
    render(<WorkAreasSection {...defaultArgs} />)

    // aria-labelledby has to resolve to the heading, otherwise the region is
    // announced without a name. getByRole with `name` only matches if it does.
    const region = screen.getByRole('region', { name: defaultArgs.title })
    const heading = screen.getByRole('heading', { name: defaultArgs.title })

    expect(region).toHaveAttribute('aria-labelledby', heading.id)
    expect(heading.id).toBe(`${defaultArgs.id}-title`)
  })

  test('falls back to a generated heading id when no id prop is given', () => {
    // The Empty story omits `id`, which exercises the useId() branch.
    render(<WorkAreasSection {...emptyArgs} />)

    const heading = screen.getByRole('heading', { name: emptyArgs.title })
    const region = screen.getByRole('region', { name: emptyArgs.title })

    expect(heading.id).not.toBe('')
    expect(heading.id).not.toMatch(/^undefined/)
    expect(region).toHaveAttribute('aria-labelledby', heading.id)
  })
})
