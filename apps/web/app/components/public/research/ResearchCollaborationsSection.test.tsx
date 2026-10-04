import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  ResearchCollaborationsSection,
  type ResearchCollaborationsSectionProps,
} from './ResearchCollaborationsSection'
import { Default, Empty } from './ResearchCollaborationsSection.stories'

const defaultArgs = Default.args as ResearchCollaborationsSectionProps
const emptyArgs = Empty.args as ResearchCollaborationsSectionProps

describe('ResearchCollaborationsSection', () => {
  test('renders the section title and description', () => {
    renderWithIntl(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Colaboraciones de investigación' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Organizaciones y grupos que colaboran con el LASCE/i),
    ).toBeInTheDocument()
  })

  test('renders all collaboration cards in default view', () => {
    renderWithIntl(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.collaborations.length,
    )
  })

  test('distinguishes between national and international collaborations', () => {
    renderWithIntl(<ResearchCollaborationsSection {...defaultArgs} />)

    const nationalBadges = screen.getAllByText('Nacional')
    const internationalBadges = screen.getAllByText('Internacional')

    const nationalCount = defaultArgs.collaborations.filter((c) => c.scope === 'national').length
    const internationalCount = defaultArgs.collaborations.filter(
      (c) => c.scope === 'international',
    ).length

    expect(nationalBadges).toHaveLength(nationalCount)
    expect(internationalBadges).toHaveLength(internationalCount)
  })

  test('displays country information for collaborating partners', () => {
    renderWithIntl(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(screen.getByText('Argentina')).toBeInTheDocument()
    expect(screen.getByText('Francia')).toBeInTheDocument()
    expect(screen.getAllByText('México')).toHaveLength(2)
    expect(screen.getAllByText('Italia')).toHaveLength(2)
    expect(screen.getAllByText('Costa Rica')).toHaveLength(2)
  })

  test('displays empty message when no collaborations are configured', () => {
    renderWithIntl(<ResearchCollaborationsSection {...emptyArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay información de colaboraciones disponible actualmente.',
    )
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
