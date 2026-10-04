import { screen } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { level: 2, name: 'SWAAT' })).toBeInTheDocument()
    expect(screen.getByText(/Analyse solar events using GOES X-ray/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open SWAPRO' })).toHaveAttribute(
      'href',
      'https://swapro.up.railway.app/',
    )
    expect(screen.getByText(/The links open in a new tab/)).toBeInTheDocument()
  })
})
