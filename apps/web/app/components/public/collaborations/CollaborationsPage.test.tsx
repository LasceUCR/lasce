import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { CollaborationsPage, type CollaborationsPageProps } from './CollaborationsPage'
import { Default } from './CollaborationsPage.stories'

const defaultArgs = Default.args as CollaborationsPageProps

describe('CollaborationsPage', () => {
  test('presents collaborations and international initiatives under one heading', () => {
    render(<CollaborationsPage {...defaultArgs} />)

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
    render(<CollaborationsPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
