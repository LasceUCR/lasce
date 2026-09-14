import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ScientificToolsList, type ScientificToolsListProps } from './ScientificToolsList'
import { Default, Empty } from './ScientificToolsList.stories'

const defaultArgs = Default.args as ScientificToolsListProps
const emptyArgs = Empty.args as ScientificToolsListProps

describe('ScientificToolsList', () => {
  test('renders each available scientific tool with its external link', () => {
    render(<ScientificToolsList {...defaultArgs} />)

    for (const tool of defaultArgs.tools) {
      expect(screen.getByRole('heading', { level: 2, name: tool.title })).toBeInTheDocument()
      expect(screen.getByText(tool.description)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `Acceder a ${tool.title}` })).toHaveAttribute(
        'href',
        tool.href,
      )
    }

    expect(screen.getByText(/Los enlaces se abren en una nueva pestaña/)).toBeInTheDocument()
  })

  test('shows an informational message when there are no scientific tools', () => {
    render(<ScientificToolsList {...emptyArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay herramientas científicas disponibles en este momento.',
    )
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText(/Los enlaces se abren en una nueva pestaña/)).not.toBeInTheDocument()
  })
})
