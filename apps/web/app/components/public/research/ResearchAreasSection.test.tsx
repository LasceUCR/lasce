import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResearchAreasSection, type ResearchAreasSectionProps } from './ResearchAreasSection'
import { Default, Empty } from './ResearchAreasSection.stories'

const defaultArgs = Default.args as ResearchAreasSectionProps
const emptyArgs = Empty.args as ResearchAreasSectionProps

describe('ResearchAreasSection', () => {
  test('lists one item per research area it is given', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    const list = screen.getByRole('list')

    expect(within(list).getAllByRole('listitem')).toHaveLength(defaultArgs.areas.length)
  })

  test('shows every research area with its title and description', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    for (const area of defaultArgs.areas) {
      const card = screen.getByRole('article', { name: area.title })

      expect(within(card).getByRole('heading', { level: 3, name: area.title })).toBeInTheDocument()
      expect(within(card).getByText(area.description)).toBeInTheDocument()
    }
  })

  test('links each research area to its own detail page', () => {
    render(<ResearchAreasSection {...defaultArgs} />)

    expect(screen.getAllByRole('link')).toHaveLength(defaultArgs.areas.length)

    for (const area of defaultArgs.areas) {
      expect(
        screen.getByRole('link', { name: `Conozca más sobre esta área (${area.title})` }),
      ).toHaveAttribute('href', `/investigacion/areas/${area.slug}`)
    }
  })

  test('renders no list and no links when there are no research areas', () => {
    render(<ResearchAreasSection {...emptyArgs} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
