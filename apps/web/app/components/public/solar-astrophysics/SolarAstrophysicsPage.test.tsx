import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import { getSolarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarAstrophysicsPage, type SolarAstrophysicsPageProps } from './SolarAstrophysicsPage'
import { Default } from './SolarAstrophysicsPage.stories'

const defaultArgs = Default.args as SolarAstrophysicsPageProps

describe('SolarAstrophysicsPage', () => {
  test('introduces solar astrophysics and what it studies', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Astrofísica solar' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Qué estudia la astrofísica solar/ }),
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
      screen.getByRole('heading', { name: 'El trabajo de LASCE en astrofísica solar' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Desde la Universidad de Costa Rica, LASCE busca/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las áreas de trabajo' })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
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
