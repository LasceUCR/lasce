import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearchAreasSection, type ResearchAreasSectionProps } from './ResearchAreasSection'
import { Default, Empty } from './ResearchAreasSection.stories'

const defaultArgs = Default.args as ResearchAreasSectionProps
const emptyArgs = Empty.args as ResearchAreasSectionProps

describe('ResearchAreasSection', () => {
  test('renders one card per research area it is given', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    const region = screen.getByRole('region', { name: defaultArgs.title })

    expect(within(region).getAllByRole('link')).toHaveLength(defaultArgs.areas.length)
  })

  test('renders each research area title and description', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      expect(screen.getByText(area.title)).toBeInTheDocument()
      expect(screen.getByText(area.description)).toBeInTheDocument()
    }
  })

  test('links each research area to its own detail page', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      expect(screen.getByRole('link', { name: new RegExp(area.title) })).toHaveAttribute(
        'href',
        `/investigacion/areas/${area.slug}`,
      )
    }
  })

  test('still renders its heading when there are no research areas', () => {
    render(<ResearchAreasSection {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: emptyArgs.title })).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  test('labels the section with its own heading', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    const region = screen.getByRole('region', { name: defaultArgs.title })
    const heading = screen.getByRole('heading', { name: defaultArgs.title })

    expect(region).toHaveAttribute('aria-labelledby', heading.id)
    expect(heading.id).toBe(`${defaultArgs.id}-title`)
  })

  test('falls back to a generated heading id when no id prop is given', () => {
    render(<ResearchAreasSection {...emptyArgs} />)

    const heading = screen.getByRole('heading', { name: emptyArgs.title })
    const region = screen.getByRole('region', { name: emptyArgs.title })

    expect(heading.id).not.toBe('')
    expect(heading.id).not.toMatch(/^undefined/)
    expect(region).toHaveAttribute('aria-labelledby', heading.id)
  })
})
