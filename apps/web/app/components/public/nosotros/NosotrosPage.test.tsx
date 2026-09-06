import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NosotrosPage, type NosotrosPageProps } from './NosotrosPage'
import { ApprovedCopy, Default } from './NosotrosPage.stories'

const defaultArgs = Default.args as NosotrosPageProps
const approvedArgs = ApprovedCopy.args as NosotrosPageProps

describe('NosotrosPage', () => {
  test('presents the laboratory under a single first-level heading', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeInTheDocument()
  })

  test('explains what LASCE is and what it is for', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(screen.getByRole('region', { name: '¿Qué es LASCE?' })).toHaveTextContent(
      /laboratorio de la Universidad de Costa Rica dedicado al estudio del Sol/,
    )
    expect(screen.getByRole('region', { name: 'Nuestro propósito' })).toHaveTextContent(
      /Generar conocimiento sobre la actividad solar y el clima espacial desde Costa Rica/,
    )
  })

  test('lists every area the laboratory works in', () => {
    render(<NosotrosPage {...defaultArgs} />)

    const focus = screen.getByRole('region', { name: /En qué trabajamos/ })
    expect(within(focus).getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.content.focusAreas.items.length,
    )
    expect(within(focus).getByRole('heading', { name: 'Astrofísica solar' })).toBeInTheDocument()
  })

  test('describes the relationship with the Universidad de Costa Rica', () => {
    render(<NosotrosPage {...defaultArgs} />)

    expect(
      screen.getByRole('region', { name: 'LASCE y la Universidad de Costa Rica' }),
    ).toHaveTextContent(/forma parte de la Universidad de Costa Rica/)
  })

  test('flags the copy as provisional while it awaits approval', () => {
    render(<NosotrosPage {...defaultArgs} />)

    const flag = screen.getByRole('complementary', { name: 'Información provisional' })
    expect(flag).toHaveTextContent(/pendiente de revisión/)
  })

  test('drops the provisional banner once the copy is approved', () => {
    render(<NosotrosPage {...approvedArgs} />)

    // Removing the `flag` key is the whole content handover, so prove it is safe up front.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '¿Qué es LASCE?' })).toBeInTheDocument()
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
    expect(screen.getByRole('region', { name: 'Nuestro propósito' })).toBeInTheDocument()
  })

  test('keeps the team section readable before the portraits arrive', () => {
    render(<NosotrosPage {...defaultArgs} />)

    const team = screen.getByRole('region', { name: /El equipo/ })
    expect(team).toHaveTextContent(/distintas disciplinas/)
    expect(within(team).queryByRole('list')).not.toBeInTheDocument()
  })
})
