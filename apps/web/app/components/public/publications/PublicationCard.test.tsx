import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { PublicationCard, type PublicationCardProps } from './PublicationCard'
import { Default, InstitutionalReport } from './PublicationCard.stories'

const defaultArgs = Default.args as PublicationCardProps
const institutionalArgs = InstitutionalReport.args as PublicationCardProps

describe('PublicationCard', () => {
  test('shows the title, authors, venue and year it was given', () => {
    render(<PublicationCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toBeInTheDocument()
    expect(
      screen.getByText(`${defaultArgs.authors} · ${defaultArgs.venue} · ${defaultArgs.year}`),
    ).toBeInTheDocument()
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
