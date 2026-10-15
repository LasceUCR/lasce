import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { CollaborationCard, type CollaborationCardProps } from './CollaborationCard'
import {
  International,
  LegacyCountry,
  National,
  TranslatedCountry,
  WithoutAcronym,
} from './CollaborationCard.stories'

const nationalArgs = National.args as CollaborationCardProps
const internationalArgs = International.args as CollaborationCardProps
const withoutAcronymArgs = WithoutAcronym.args as CollaborationCardProps

describe('CollaborationCard', () => {
  test('renders national collaboration name, country and scope badge', () => {
    renderWithIntl(<CollaborationCard {...nationalArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: nationalArgs.name })).toBeInTheDocument()
    expect(screen.getByText('Nacional')).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(nationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders international collaboration details', () => {
    renderWithIntl(<CollaborationCard {...internationalArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: internationalArgs.name }),
    ).toBeInTheDocument()
    expect(screen.getByText('Internacional')).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.country)).toBeInTheDocument()
    expect(screen.getByText(internationalArgs.acronym as string)).toBeInTheDocument()
  })

  test('renders without acronym when not provided', () => {
    renderWithIntl(<CollaborationCard {...withoutAcronymArgs} />)

    expect(
      screen.getByRole('heading', { level: 3, name: withoutAcronymArgs.name }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Siglas:/)).not.toBeInTheDocument()
  })

  test('renders translated country text and English labels while preserving official names', () => {
    renderWithIntl(<CollaborationCard {...(TranslatedCountry.args as CollaborationCardProps)} />, {
      locale: 'en',
    })

    expect(screen.getByRole('heading', { name: withoutAcronymArgs.name })).toBeInTheDocument()
    expect(screen.getByText('International')).toBeInTheDocument()
    expect(screen.getByText('France')).toHaveAttribute('lang', 'en')
  })

  test('keeps a legacy country readable without claiming it is in the interface language', () => {
    renderWithIntl(<CollaborationCard {...(LegacyCountry.args as CollaborationCardProps)} />, {
      locale: 'en',
    })

    expect(screen.getByText('International')).toBeInTheDocument()
    expect(screen.getByText('Francia')).toHaveAttribute('lang', '')
  })
})
