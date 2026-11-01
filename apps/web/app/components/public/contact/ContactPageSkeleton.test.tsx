import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getContactContent } from '@/app/lib/contact'
import { getMessages } from '@/app/lib/i18n/messages'

import {
  CONTACT_CHANNEL_PLACEHOLDERS,
  ContactPageSkeleton,
  type ContactPageSkeletonProps,
} from './ContactPageSkeleton'
import { Default } from './ContactPageSkeleton.stories'

const args = Default.args as ContactPageSkeletonProps

describe('ContactPageSkeleton', () => {
  test('shows the catalogue copy straight away and placeholders for the map and the cards', () => {
    const { container } = render(<ContactPageSkeleton {...args} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Contacto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Ubicación' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Ubicación' })).toHaveTextContent(
      args.content.location.address,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Información de contacto' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Mapa de ubicación/ })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.info-card')).toHaveLength(CONTACT_CHANNEL_PLACEHOLDERS)
  })

  test('announces the load once and keeps the placeholders out of the tab order', () => {
    render(<ContactPageSkeleton {...args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando contacto…')
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('follows the language of the content it is given', () => {
    const content = getContactContent(getMessages('en'))
    render(<ContactPageSkeleton content={content} label="Loading contact…" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Location' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Location' })).toHaveTextContent(
      content.location.address,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Contact information' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading contact…')
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
