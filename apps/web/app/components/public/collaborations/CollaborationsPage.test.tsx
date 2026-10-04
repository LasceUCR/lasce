import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getCollaborationsContent } from '@/app/lib/collaborations'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { getResearchCollaborations } from '@/app/lib/research-collaborations'

import { CollaborationsPage, type CollaborationsPageProps } from './CollaborationsPage'
import { Default } from './CollaborationsPage.stories'

const defaultArgs = Default.args as CollaborationsPageProps

describe('CollaborationsPage', () => {
  test('presents collaborations and international initiatives under one heading', () => {
    renderWithIntl(<CollaborationsPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Colaboraciones e Iniciativas' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { level: 2, name: 'Colaboraciones de investigación' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Instituto Tecnológico de Costa Rica' }),
    ).toBeInTheDocument()

    const initiatives = screen.getByRole('region', {
      name: 'Iniciativas internacionales de las que LASCE forma parte',
    })
    expect(
      within(initiatives).getByRole('heading', {
        level: 3,
        name: 'Iniciativa Internacional de Clima Espacial (ISWI)',
      }),
    ).toBeInTheDocument()
    expect(
      within(initiatives).getByRole('img', {
        name: 'Logotipo de la Iniciativa Internacional de Clima Espacial (ISWI)',
      }),
    ).toBeInTheDocument()
    expect(
      within(initiatives).getByRole('heading', {
        level: 3,
        name: 'Iniciativa VLBI Iberoamericana (IVIA)',
      }),
    ).toBeInTheDocument()
    expect(
      within(initiatives).getByRole('img', {
        name: 'Logotipo de la Iniciativa VLBI Iberoamericana (IVIA)',
      }),
    ).toBeInTheDocument()
    expect(
      within(initiatives).getByRole('link', { name: 'Sitio oficial de la ISWI' }),
    ).toHaveAttribute('href', 'https://www.unoosa.org/oosa/en/ourwork/psa/bssi/iswi.html')
    expect(
      within(initiatives).getByRole('link', { name: 'Sitio oficial de la IVIA' }),
    ).toHaveAttribute('href', 'https://oaq.epn.edu.ec/ivia-net/index.php/es/')
  })

  test('returns to the public landing page', () => {
    renderWithIntl(<CollaborationsPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('shows the page in English when it is rendered in English', () => {
    const messages = getMessages('en')
    renderWithIntl(
      <CollaborationsPage
        collaborations={getResearchCollaborations(messages.collaborations.countries)}
        content={getCollaborationsContent(messages)}
      />,
      { locale: 'en' },
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Collaborations and Initiatives' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Research collaborations' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('International').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Italy')).toHaveLength(2)
    // Organization names are proper nouns and stay as they are.
    expect(
      screen.getByRole('heading', { level: 3, name: 'Instituto Tecnológico de Costa Rica' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Official IVIA site' })).toHaveAttribute(
      'href',
      'https://oaq.epn.edu.ec/ivia-net/index.php/es/',
    )
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
