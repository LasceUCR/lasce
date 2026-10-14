import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import { getSolarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarAstrophysicsPage, type SolarAstrophysicsPageProps } from './SolarAstrophysicsPage'
import { Default, WithoutLasceSection } from './SolarAstrophysicsPage.stories'

const defaultArgs = Default.args as SolarAstrophysicsPageProps

describe('SolarAstrophysicsPage', () => {
  test('introduces solar astrophysics and what it studies', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Física Solar' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Qué estudia la Física Solar/ }),
    ).toBeInTheDocument()
    for (const title of [
      'Actividad solar',
      'Campo magnético',
      'Relación Sol-Tierra',
      'Análisis científico',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    }
  })

  test('describes the work of LASCE and links back to the work areas', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { name: 'El trabajo de LASCE en Física Solar' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Desde la Universidad de Costa Rica, LASCE busca/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las áreas de trabajo' })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
  })

  test('leaves the LASCE section out when the database has none', () => {
    render(<SolarAstrophysicsPage {...(WithoutLasceSection.args as SolarAstrophysicsPageProps)} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Física Solar' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'El trabajo de LASCE en Física Solar' }),
    ).not.toBeInTheDocument()
  })

  test('shows the page in English when given the English content', () => {
    render(<SolarAstrophysicsPage content={getSolarAstrophysicsContent(getMessages('en'))} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Solar astrophysics' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Magnetic field' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the work areas' })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
  })
})
