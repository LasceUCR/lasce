import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { getScientificTools } from '@/app/lib/scientific-tools'

import { ScientificToolsList, type ScientificToolsListProps } from './ScientificToolsList'
import { Default, Empty } from './ScientificToolsList.stories'

const defaultArgs = Default.args as ScientificToolsListProps
const emptyArgs = Empty.args as ScientificToolsListProps

describe('ScientificToolsList', () => {
  test('renders each available scientific tool with its external link', () => {
    renderWithIntl(<ScientificToolsList {...defaultArgs} />)

    for (const tool of defaultArgs.tools) {
      const card = within(screen.getByRole('article', { name: tool.title }))
      expect(card.getByRole('heading', { level: 3, name: tool.title })).toBeInTheDocument()
      expect(card.getByText(tool.description)).toBeInTheDocument()
      const link = card.getByRole('link', { name: `Acceder a ${tool.title}` })
      expect(link).toHaveAttribute('href', tool.href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }

    expect(screen.queryByText(/Los enlaces se abren en una nueva pestaña/)).not.toBeInTheDocument()
  })

  test('shows an informational message when there are no scientific tools', () => {
    renderWithIntl(<ScientificToolsList {...emptyArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay herramientas científicas disponibles en este momento.',
    )
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText(/Los enlaces se abren en una nueva pestaña/)).not.toBeInTheDocument()
  })

  test('describes and links the tools in English when the page is rendered in English', () => {
    const tools = getScientificTools(getMessages('en').scientificTools)
    renderWithIntl(<ScientificToolsList tools={tools} />, { locale: 'en' })

    for (const tool of tools) {
      const card = within(screen.getByRole('article', { name: tool.title }))
      expect(card.getByRole('heading', { level: 3, name: tool.title })).toBeInTheDocument()
      expect(card.getByText(tool.description)).toBeInTheDocument()
      expect(card.getByRole('link', { name: `Open ${tool.title}` })).toHaveAttribute(
        'href',
        tool.href,
      )
    }
    expect(screen.queryByText(/The links open in a new tab/)).not.toBeInTheDocument()
  })
})
