import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import {
  ResearchCollaborationsSection,
  type ResearchCollaborationsSectionProps,
} from './ResearchCollaborationsSection'
import { Default, Empty } from './ResearchCollaborationsSection.stories'

const defaultArgs = Default.args as ResearchCollaborationsSectionProps
const emptyArgs = Empty.args as ResearchCollaborationsSectionProps

async function selectScope(
  user: ReturnType<typeof userEvent.setup>,
  scope: 'Todas las colaboraciones' | 'Nacionales' | 'Internacionales',
) {
  await user.click(screen.getByRole('combobox', { name: 'Tipo de colaboración' }))
  await user.click(screen.getByRole('option', { name: scope }))
}

describe('ResearchCollaborationsSection', () => {
  test('renders the section title and description', () => {
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Colaboraciones de investigación' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Organizaciones y grupos que colaboran con el LASCE/i),
    ).toBeInTheDocument()
  })

  test('renders all collaboration cards in default view', () => {
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.collaborations.length,
    )
  })

  test('distinguishes between national and international collaborations', () => {
    render(<ResearchCollaborationsSection {...defaultArgs} />)

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
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    expect(screen.getByText('Argentina')).toBeInTheDocument()
    expect(screen.getByText('Francia')).toBeInTheDocument()
    expect(screen.getAllByText('México')).toHaveLength(2)
    expect(screen.getAllByText('Italia')).toHaveLength(2)
    expect(screen.getAllByText('Costa Rica')).toHaveLength(2)
  })

  test('filters by national scope and updates the KPI', async () => {
    const user = userEvent.setup()
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    await selectScope(user, 'Nacionales')

    const nationalCollaborations = defaultArgs.collaborations.filter((c) => c.scope === 'national')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(nationalCollaborations.length)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('colaboraciones nacionales')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Instituto Tecnológico de Costa Rica' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Instituto Costarricense de Electricidad' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 3,
        name: 'Facultad de Ciencias Exactas y Tecnología',
      }),
    ).not.toBeInTheDocument()
  })

  test('filters by international scope and updates the KPI', async () => {
    const user = userEvent.setup()
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    await selectScope(user, 'Internacionales')

    const internationalCollaborations = defaultArgs.collaborations.filter(
      (c) => c.scope === 'international',
    )
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      internationalCollaborations.length,
    )
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('colaboraciones internacionales')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 3,
        name: 'Instituto Tecnológico de Costa Rica',
      }),
    ).not.toBeInTheDocument()
  })

  test('filters by search text in organization name, acronym, or country', async () => {
    const user = userEvent.setup()
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    const searchInput = screen.getByRole('searchbox', { name: 'Buscar colaboraciones' })

    await user.type(searchInput, 'SCiESMEX')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Servicio de Clima Espacial México' }),
    ).toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, 'Argentina')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Facultad de Ciencias Exactas y Tecnología',
      }),
    ).toBeInTheDocument()
  })

  test('displays empty message when no collaborations are configured', () => {
    render(<ResearchCollaborationsSection {...emptyArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay información de colaboraciones disponible actualmente.',
    )
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('displays empty message when search yields no matches', async () => {
    const user = userEvent.setup()
    render(<ResearchCollaborationsSection {...defaultArgs} />)

    const searchInput = screen.getByRole('searchbox', { name: 'Buscar colaboraciones' })
    await user.type(searchInput, 'Universidad Inexistente')

    expect(screen.getByRole('status')).toHaveTextContent(
      'No se encontraron colaboraciones para “Universidad Inexistente”.',
    )
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
