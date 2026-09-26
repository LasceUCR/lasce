import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { CollaborationCard, type CollaborationCardProps } from './CollaborationCard'
import { International, National, WithoutAcronym } from './CollaborationCard.stories'

const nationalArgs = National.args as CollaborationCardProps
const internationalArgs = International.args as CollaborationCardProps
const withoutAcronymArgs = WithoutAcronym.args as CollaborationCardProps

describe('CollaborationCard', () => {
  test('renders national collaboration name, country and scope badge', () => {
    render(<CollaborationCard {...nationalArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: nationalArgs.name })).toBeInTheDocument()
    expect(screen.getByText('Nacional')).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders international collaboration details', () => {
    render(<CollaborationCard {...internationalArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: internationalArgs.name }),
    ).toBeInTheDocument()
    expect(screen.getByText('Internacional')).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders without acronym when not provided', () => {
    render(<CollaborationCard {...withoutAcronymArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: withoutAcronymArgs.name }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Siglas:/)).not.toBeInTheDocument()
  })
})
