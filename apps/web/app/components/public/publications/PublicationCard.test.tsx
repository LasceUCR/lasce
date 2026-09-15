import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { PublicationCard, type PublicationCardProps } from './PublicationCard'
import { Default, InstitutionalReport } from './PublicationCard.stories'

const defaultArgs = Default.args as PublicationCardProps
const institutionalArgs = InstitutionalReport.args as PublicationCardProps

describe('PublicationCard', () => {
  test('shows the title, authors, venue, year and research group it was given', () => {
    const { container } = render(<PublicationCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toBeInTheDocument()

    const metadata = container.querySelector('.publication-meta')

    expect(metadata).toHaveTextContent(defaultArgs.authors)
    expect(metadata).toHaveTextContent(defaultArgs.venue)
    expect(metadata).toHaveTextContent(defaultArgs.year)
    expect(metadata).toHaveTextContent(defaultArgs.researchGroup)
  })

  test('shows the abstract, clamped so it cannot grow past two lines', () => {
    render(<PublicationCard {...defaultArgs} />)

    const abstract = screen.getByText(defaultArgs.abstract)
    expect(abstract).toHaveClass('publication-abstract')
  })

  test('links out through the DOI / external link action', () => {
    render(<PublicationCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /DOI \/ Enlace externo/ })
    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('renders a non-scientific publication venue without truncating it', () => {
    render(<PublicationCard {...institutionalArgs} />)

    expect(screen.getByText(institutionalArgs.venue, { exact: false })).toBeInTheDocument()
  })
})
