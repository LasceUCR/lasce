import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearchAreasSection, type ResearchAreasSectionProps } from './ResearchAreasSection'
import { Default, Empty } from './ResearchAreasSection.stories'

const defaultArgs = Default.args as ResearchAreasSectionProps
const emptyArgs = Empty.args as ResearchAreasSectionProps

describe('ResearchAreasSection', () => {
  test('renders the section title and description', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Áreas de investigación' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Principales ramas de investigación desarrolladas por el LASCE.'),
    ).toBeInTheDocument()
  })

  test('renders one link per research area it is given', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    expect(screen.getAllByRole('link')).toHaveLength(defaultArgs.areas.length)
  })

  test('renders each research area title', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      expect(screen.getByText(area.title)).toBeInTheDocument()
    }
  })

  test('renders the research area call to action', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    expect(screen.getAllByText('Conozca más sobre esta área')).toHaveLength(
      defaultArgs.areas.length,
    )
  })

  test('links each research area to its own detail page', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      expect(
        screen.getByRole('link', {
          name: new RegExp(area.title),
        }),
      ).toHaveAttribute('href', `/investigacion/areas/${area.slug}`)
    }
  })

  test('renders no links when there are no research areas', () => {
    render(<ResearchAreasSection {...emptyArgs} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
