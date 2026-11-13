import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import { getSolarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarAstrophysicsPage, type SolarAstrophysicsPageProps } from './SolarAstrophysicsPage'
import { Default, WithoutLasceSection } from './SolarAstrophysicsPage.stories'

vi.mock('./useLatestSuviObservation', () => ({
  useLatestSuviObservation: () => ({ status: 'unavailable' }),
}))

const defaultArgs = Default.args as SolarAstrophysicsPageProps

describe('SolarAstrophysicsPage', () => {
  test('introduces solar astrophysics and what it studies', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Física Solar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Qué estudia la Física Solar/ })).toBeInTheDocument()
    const flow = screen.getByRole('group', { name: 'Cadena de estudio' })
    expect(within(flow).getByRole('link', { name: 'Entorno terrestre' })).toHaveAttribute(
      'href',
      '/clima-espacial',
    )
    expect(within(flow).getByRole('link', { name: 'Análisis LASCE' })).toHaveAttribute(
      'href',
      '/datos',
    )
    for (const title of [
      'Actividad solar',
      'Campo magnético',
      'Relación Sol-Tierra',
      'Análisis científico',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    }
  })

  test('describes the work of LASCE without a redundant back link', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', { name: 'El trabajo de LASCE en Física Solar' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Desde la Universidad de Costa Rica, LASCE busca/)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Volver a las áreas de trabajo' }),
    ).not.toBeInTheDocument()
  })

  test('offers a nearby path to solar imagery and a link to space weather', () => {
    render(<SolarAstrophysicsPage {...defaultArgs} />)

    expect(screen.queryByRole('heading', { name: 'El Sol ahora' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/Esta imagen muestra el Sol en luz ultravioleta extrema/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Datos' })).toHaveAttribute('href', '/datos')
    const nextSteps = screen.getByRole('navigation', { name: 'Próximos pasos' })
    expect(screen.getByRole('heading', { name: 'Próximos pasos' })).toBeInTheDocument()
    expect(within(nextSteps).getByRole('link', { name: 'Ver el Sol de hoy' })).toHaveAttribute(
      'href',
      '/datos#solar-today-title',
    )
    expect(
      within(nextSteps).getByRole('link', { name: 'Consultar datos de rayos X' }),
    ).toHaveAttribute('href', '/datos#scientific-query-title')
    expect(
      within(nextSteps).getByRole('link', { name: 'Seguir la cadena: clima espacial' }),
    ).toHaveAttribute('href', '/clima-espacial')
    expect(
      within(nextSteps).getByRole('link', { name: 'Consultar publicaciones de LASCE' }),
    ).toHaveAttribute('href', '/publicaciones?q=solar&group=LASCE')
    expect(
      within(nextSteps).getByRole('link', { name: 'Explorar herramientas científicas' }),
    ).toHaveAttribute('href', '/herramientas-cientificas')
    expect(screen.getByRole('link', { name: 'Ir a Datos' })).toHaveAttribute('href', '/datos')
    expect(screen.getByRole('complementary')).toContainElement(
      screen.getByRole('link', { name: 'Ir a Datos' }),
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
    expect(screen.queryByRole('heading', { name: 'The Sun now' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/This image shows the sun in extreme ultraviolet light/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Data' })).toHaveAttribute('href', '/datos')
    const nextSteps = screen.getByRole('navigation', { name: 'Next steps' })
    expect(within(nextSteps).getByRole('link', { name: 'View the Sun today' })).toHaveAttribute(
      'href',
      '/datos#solar-today-title',
    )
    expect(within(nextSteps).getByRole('link', { name: 'Query X-ray data' })).toHaveAttribute(
      'href',
      '/datos#scientific-query-title',
    )
    expect(
      within(nextSteps).getByRole('link', { name: 'Browse LASCE publications' }),
    ).toHaveAttribute('href', '/publicaciones?q=solar&group=LASCE')
    expect(screen.queryByRole('link', { name: 'Back to the work areas' })).not.toBeInTheDocument()
  })
})
