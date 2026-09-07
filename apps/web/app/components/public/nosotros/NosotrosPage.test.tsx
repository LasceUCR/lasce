import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NosotrosPage, type NosotrosPageProps } from './NosotrosPage'
import { Default, ProvisionalCopy } from './NosotrosPage.stories'

const defaultArgs = Default.args as NosotrosPageProps
const provisionalArgs = ProvisionalCopy.args as NosotrosPageProps

describe('NosotrosPage', () => {
  test('presents the laboratory under a single first-level heading', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeInTheDocument()
  })

  test('explains what LASCE is and what it is for', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getByRole('region', { name: '¿Quiénes somos?' })).toHaveTextContent(
      /iniciativa científica vinculada al Centro de Investigaciones Espaciales/,
    )
    expect(screen.getByRole('region', { name: 'Nuestra visión' })).toHaveTextContent(
      /referente regional para la observación del Sol/,
    )
    expect(screen.getByRole('region', { name: 'Aporte distintivo' })).toHaveTextContent(
      /no sea únicamente usuaria de información internacional/,
    )
  })

  test('lists everything the laboratory does', () => {
    render(<NosotrosPage {...defaultArgs} />)

    const activities = screen.getByRole('region', { name: /Qué hacemos/ })
    expect(within(activities).getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.content.activities.items.length,
    )
    expect(
      within(activities).getByRole('heading', { name: 'Fenómenos solares eruptivos' }),
    ).toBeInTheDocument()
  })

  test('names the university the laboratory belongs to', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getByRole('region', { name: '¿Quiénes somos?' })).toHaveTextContent(
      /Universidad de Costa Rica/,
    )
  })

  test('shows no provisional banner now that the copy is approved', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  test('flags the copy when a revision is pending approval', () => {
    render(<NosotrosPage {...provisionalArgs} />)

    // The banner branch stays covered so the next editorial revision can use it.
    expect(
      screen.getByRole('complementary', { name: 'Información provisional' }),
    ).toHaveTextContent(/pendiente de revisión/)
  })

  test('returns to the public landing page', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('accepts revised editorial content through props', () => {
    render(
      <NosotrosPage
        content={{
          ...defaultArgs.content,
          overview: { title: 'Acerca del laboratorio', paragraphs: ['Descripción actualizada.'] },
        }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Acerca del laboratorio' })).toHaveTextContent(
      'Descripción actualizada.',
    )
    expect(screen.getByRole('region', { name: 'Nuestra visión' })).toBeInTheDocument()
  })

  test('introduces every member of the team', () => {
    render(<NosotrosPage {...defaultArgs} />)

    const team = screen.getByRole('region', { name: /El equipo/ })
    const track = within(team).getByRole('list', { name: defaultArgs.content.team.title })

    expect(within(track).getAllByRole('listitem')).toHaveLength(
      defaultArgs.content.team.people.length,
    )
    expect(within(team).getByText('Dra. Carolina Salas Matamoros')).toBeInTheDocument()
  })
})
