import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ContactPage, type ContactPageProps } from './ContactPage'
import { Default, OmitsIncompleteChannels } from './ContactPage.stories'

const defaultArgs = Default.args as ContactPageProps
const incompleteArgs = OmitsIncompleteChannels.args as ContactPageProps

describe('ContactPage', () => {
  test('shows the official channels under a single page heading', () => {
    render(<ContactPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Información de contacto' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Teléfono' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2511-6566' })).toHaveAttribute(
      'href',
      'tel:+50625116566',
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Ubicación' })).toBeInTheDocument()
    expect(
      screen.getByText('Universidad de Costa Rica, Sede Rodrigo Facio Brenes'),
    ).toBeInTheDocument()
    expect(screen.getByText('Montes de Oca, San José, Costa Rica')).toBeInTheDocument()
    expect(screen.queryByText(/código postal/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/lasce_ucr/',
    )
    expect(screen.queryByText('Contenido en preparación')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correo electrónico' })).not.toBeInTheDocument()
  })

  test('opens Instagram in a new tab', () => {
    render(<ContactPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute('rel', 'noreferrer')
  })

  test('omits channels that are blank or still a placeholder', () => {
    render(<ContactPage {...incompleteArgs} />)

    expect(screen.getByRole('link', { name: '2511-6566' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correo electrónico' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fax' })).not.toBeInTheDocument()
    expect(screen.queryByText('Por definir')).not.toBeInTheDocument()
  })

  test('returns to the public landing page', () => {
    render(<ContactPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
