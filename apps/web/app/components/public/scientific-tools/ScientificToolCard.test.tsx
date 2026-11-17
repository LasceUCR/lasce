import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { ScientificToolCard, type ScientificToolCardProps } from './ScientificToolCard'
import { Default, Legacy, NoImage } from './ScientificToolCard.stories'

const defaultArgs = Default.args as ScientificToolCardProps

describe('ScientificToolCard', () => {
  test('presents the tool with a button that opens it safely in a new tab', () => {
    const { tool } = defaultArgs
    renderWithIntl(<ScientificToolCard {...defaultArgs} />)

    const card = within(screen.getByRole('article', { name: tool.name }))
    expect(card.getByRole('heading', { level: 3, name: tool.name })).toBeInTheDocument()
    expect(card.getByText(tool.description)).toBeInTheDocument()
    const link = card.getByRole('link', { name: `Acceder a ${tool.name}` })
    expect(link).toHaveAttribute('href', tool.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(card.getByRole('heading', { level: 3 }).parentElement).toHaveAttribute('lang', 'es')
  })

  test('names the button in the visitor language', () => {
    renderWithIntl(<ScientificToolCard {...defaultArgs} />, { locale: 'en' })

    expect(screen.getByRole('link', { name: 'Open SWAAT' })).toBeInTheDocument()
  })

  test('shows a neutral illustration when there is no image or it fails to load', () => {
    const { container, unmount } = renderWithIntl(
      <ScientificToolCard {...(NoImage.args as ScientificToolCardProps)} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg.lucide-flask-conical')).not.toBeNull()
    unmount()

    const rendered = renderWithIntl(<ScientificToolCard {...defaultArgs} />)
    fireEvent.error(rendered.container.querySelector('img')!)
    expect(rendered.container.querySelector('img')).toBeNull()
    expect(screen.getByText(defaultArgs.tool.description)).toBeInTheDocument()
  })

  test('marks text of unknown language without changing the button language', () => {
    renderWithIntl(<ScientificToolCard {...(Legacy.args as ScientificToolCardProps)} />)

    expect(screen.getByRole('heading', { level: 3 }).parentElement).toHaveAttribute('lang', '')
  })
})
