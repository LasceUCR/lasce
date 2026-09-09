import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { RosacInfoPage, type RosacInfoPageProps } from './RosacInfoPage'
import { Default } from './RosacInfoPage.stories'

const defaultArgs = Default.args as RosacInfoPageProps

describe('RosacInfoPage', () => {
  test('explains the observatory purpose, characteristics and relationship with LASCE', () => {
    render(<RosacInfoPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Radioastronomía' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '¿Qué es ROSAC?' })).toHaveTextContent(
      /observar el Sol y otras fuentes celestes/,
    )
    expect(screen.getByRole('heading', { name: 'Antena de 11 metros' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Santa Cruz, Guanacaste' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entre 100 y 1000 MHz' })).toBeInTheDocument()
    expect(screen.getByText(/Se preparan observaciones en este rango/)).toBeInTheDocument()

    const relationship = screen.getByRole('region', { name: 'ROSAC y LASCE' })
    expect(relationship).toHaveTextContent('LASCE convierte observaciones en conocimiento')
    expect(relationship).toHaveTextContent('ROSAC aporta infraestructura nacional')
  })

  test('shows an enabled scientific consultation button without creating a navigation link', () => {
    render(<RosacInfoPage {...defaultArgs} />)

    const consultation = screen.getByRole('region', { name: 'Consulta científica' })
    expect(within(consultation).queryByText('Próximamente')).not.toBeInTheDocument()
    const button = within(consultation).getByRole('button', {
      name: 'Consultar información científica',
    })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toHaveAttribute('href')
    expect(within(consultation).queryByRole('link')).not.toBeInTheDocument()
  })

  test('returns to the home access cards', () => {
    render(<RosacInfoPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: defaultArgs.content.backLink.label })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
  })

  test('accepts revised editorial content through props', () => {
    render(
      <RosacInfoPage
        content={{
          ...defaultArgs.content,
          overview: { title: 'Acerca del observatorio', paragraphs: ['Descripción actualizada.'] },
        }}
      />,
    )

    const overview = screen.getByRole('region', { name: 'Acerca del observatorio' })
    expect(overview).toHaveTextContent('Descripción actualizada.')
    expect(screen.getByRole('region', { name: 'ROSAC y LASCE' })).toBeInTheDocument()
  })

  test('introduces every ROSAC researcher', () => {
    render(<RosacInfoPage {...defaultArgs} />)

    const team = screen.getByRole('region', { name: /Investigadores/ })
    const track = within(team).getByRole('list', { name: defaultArgs.content.team.title })

    expect(within(track).getAllByRole('listitem')).toHaveLength(
      defaultArgs.content.team.people.length,
    )
    expect(within(team).getByText('Dra. Carolina Salas Matamoros')).toBeInTheDocument()
    expect(within(team).getByText('Investigadora principal')).toBeInTheDocument()
  })

  test('explains when no ROSAC researchers are available', () => {
    render(
      <RosacInfoPage
        content={{
          ...defaultArgs.content,
          team: { ...defaultArgs.content.team, people: [] },
        }}
      />,
    )

    const team = screen.getByRole('region', { name: /Investigadores/ })
    expect(within(team).getByRole('status')).toHaveTextContent(
      defaultArgs.content.team.emptyMessage,
    )
    expect(within(team).queryByRole('list')).not.toBeInTheDocument()
  })
})
