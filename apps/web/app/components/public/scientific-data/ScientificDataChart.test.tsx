import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { describe, expect, test } from 'vitest'

import { ScientificDataChart } from './ScientificDataChart'
import {
  AcrossUtcMidnight,
  Default,
  Empty,
  EnglishFlux,
  EuvFlux,
  SinglePoint,
  XrayFlare,
} from './ScientificDataChart.stories'
import type { ScientificDataChartProps } from './ScientificDataChart'
import { type ScientificDataExplorerProps } from './ScientificDataExplorer'
import { WithObservedResults } from './ScientificDataExplorer.stories'

const resultFixture = (WithObservedResults.args as ScientificDataExplorerProps).initialResult!

describe('ScientificDataChart', () => {
  test('handles a source with no values without rendering an invalid plot', () => {
    renderWithIntl(<ScientificDataChart {...(Empty.args as ScientificDataChartProps)} />)
    expect(screen.getByRole('status')).toHaveTextContent('No hay valores para graficar.')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('describes a single available observation', () => {
    renderWithIntl(<ScientificDataChart {...(SinglePoint.args as ScientificDataChartProps)} />)
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/Serie de 1 mediciones/)
    expect(screen.getByText(/^Intervalo:/)).toHaveTextContent(
      'Intervalo: 10 sept 2026, 08:00:00 – 10 sept 2026, 08:00:00 UTC',
    )
  })

  test('labels the quantity with the supplied unit and shows the plotted interval in UTC', () => {
    renderWithIntl(<ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} />)

    expect(screen.getByText('Flujo (W/m²)')).toBeInTheDocument()
    expect(screen.getByText(/^Intervalo:/)).toHaveTextContent(
      'Intervalo: 5 nov 2026, 08:00:00 – 5 nov 2026, 09:00:00 UTC',
    )
  })

  test('updates the dates, times and unit when the plotted series changes', () => {
    const { rerender } = renderWithIntl(
      <ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} />,
    )
    rerender(
      <ScientificDataChart
        {...(AcrossUtcMidnight.args as ScientificDataChartProps)}
        unit="mW/m²"
      />,
    )

    expect(screen.getByText('Flujo (mW/m²)')).toBeInTheDocument()
    expect(screen.queryByText('Flujo (W/m²)')).not.toBeInTheDocument()
    expect(screen.getByText(/^Intervalo:/)).toHaveTextContent(
      'Intervalo: 31 dic 2026, 23:45:00 – 1 ene 2027, 00:15:00 UTC',
    )
    expect(screen.getByRole('img')).toHaveAccessibleDescription(
      /31 dic 2026, 23:45:00 y 1 ene 2027, 00:15:00 UTC/,
    )
  })

  test('localizes the interval in English without changing the UTC dates', () => {
    renderWithIntl(<ScientificDataChart {...(EnglishFlux.args as ScientificDataChartProps)} />, {
      locale: 'en',
    })

    expect(screen.getByText('Flux (W/m²)')).toBeInTheDocument()
    expect(screen.getByText(/^Interval:/)).toHaveTextContent(
      'Interval: Dec 31, 2026, 23:45:00 – Jan 1, 2027, 00:15:00 UTC',
    )
  })

  test('converts timestamps with offsets to UTC for the interval and point readout', async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <ScientificDataChart
        {...(XrayFlare.args as ScientificDataChartProps)}
        points={[
          { timestamp: '2026-11-05T17:45:00-06:00', value: 2.1e-7 },
          { timestamp: '2026-11-05T18:15:00-06:00', value: 4.2e-7 },
        ]}
      />,
    )

    expect(screen.getByText(/^Intervalo:/)).toHaveTextContent(
      'Intervalo: 5 nov 2026, 23:45:00 – 6 nov 2026, 00:15:00 UTC',
    )
    await user.tab()
    expect(screen.getByText('00:15 UTC: 4,2E-7 W/m²')).toBeInTheDocument()
  })

  test('uses the bounds of the drawn points when a logarithmic chart omits zeroes', () => {
    renderWithIntl(
      <ScientificDataChart
        {...(XrayFlare.args as ScientificDataChartProps)}
        points={[
          { timestamp: '2026-11-05T07:00:00Z', value: 0 },
          ...XrayFlare.args!.points!,
          { timestamp: '2026-11-05T10:00:00Z', value: 0 },
        ]}
      />,
    )

    expect(screen.getByText(/^Intervalo:/)).toHaveTextContent(
      'Intervalo: 5 nov 2026, 08:00:00 – 5 nov 2026, 09:00:00 UTC',
    )
  })
  test('describes the visualized series through the accessibility tree', () => {
    if (resultFixture.visualization !== 'time-series') throw new Error('Expected a time series')

    renderWithIntl(
      <ScientificDataChart
        caption="Observaciones de NOAA."
        label={resultFixture.product.name}
        points={resultFixture.points}
        unit={resultFixture.parameter.unit}
      />,
    )

    expect(
      screen.getByRole('img', { name: `Gráfica de ${resultFixture.product.name}` }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Observaciones de NOAA/)).toHaveTextContent(
      resultFixture.parameter.unit,
    )
  })

  test('draws X-ray flux on a log scale with the flare classes and names the peak class', () => {
    const { container } = renderWithIntl(
      <ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} />,
    )

    expect(screen.getByRole('img')).toHaveAccessibleDescription(/clase M3\.4/)
    const guide = screen.getByRole('note', { name: 'Cómo leer esta gráfica' })
    expect(guide).toHaveTextContent(/escala logarítmica/)
    expect(guide).toHaveTextContent(/clases de fulguración/)
    const letters = [...container.querySelectorAll('.data-chart-flare-class')].map(
      (letter) => letter.textContent,
    )
    expect(letters).toEqual(['B', 'C', 'M'])
    expect(container.querySelector('.data-chart-peak-label')).toHaveTextContent('M3.4')
  })

  test('keeps a linear series without flare classes, its axis on round values', () => {
    const { container } = renderWithIntl(
      <ScientificDataChart {...(Default.args as ScientificDataChartProps)} />,
    )

    expect(container.querySelector('.data-chart-flare-class')).toBeNull()
    expect(screen.getByText(/Muestras de prueba/)).not.toHaveTextContent(/logarítmica/)
    const ticks = [...container.querySelectorAll('.data-chart-axis-text[text-anchor="end"]')]
      .map((tick) => tick.textContent)
      .filter((tick) => tick && !tick.includes('UTC'))
    expect(ticks).toEqual(['1E1', '1,5E1', '2E1', '2,5E1', '3E1'])
    expect(screen.queryByRole('note', { name: 'Cómo leer esta gráfica' })).not.toBeInTheDocument()
  })

  test('explains both axes, the physical unit and scientific notation in everyday language', () => {
    renderWithIntl(<ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} />)
    const guide = screen.getByRole('note', { name: 'Cómo leer esta gráfica' })

    expect(within(guide).getByText('Eje vertical: flujo solar')).toBeInTheDocument()
    expect(guide).toHaveTextContent('Cuanto más alta está la línea, mayor es el flujo.')
    expect(guide).toHaveTextContent('W/m² significa vatios por metro cuadrado.')
    expect(within(guide).getByText('Eje horizontal: tiempo')).toBeInTheDocument()
    expect(guide).toHaveTextContent('El tiempo avanza de izquierda a derecha.')
    expect(guide).toHaveTextContent('UTC (tiempo universal coordinado)')
    expect(guide).toHaveTextContent('1E-7 equivale a 0,0000001.')
    expect(guide).toHaveTextContent('Pasar de 1E-7 a 1E-6 representa diez veces más flujo')
  })

  test('explains a linear EUV chart without describing a logarithmic scale or flare classes', () => {
    renderWithIntl(<ScientificDataChart {...(EuvFlux.args as ScientificDataChartProps)} />)
    const guide = screen.getByRole('note', { name: 'Cómo leer esta gráfica' })

    expect(guide).toHaveTextContent('W/m² significa vatios por metro cuadrado.')
    expect(guide).not.toHaveTextContent(/logarítmica|fulguración/)
  })

  test('translates the reading guide and its decimal example into English', () => {
    renderWithIntl(<ScientificDataChart {...(EnglishFlux.args as ScientificDataChartProps)} />, {
      locale: 'en',
    })
    const guide = screen.getByRole('note', { name: 'How to read this chart' })

    expect(within(guide).getByText('Vertical axis: solar flux')).toBeInTheDocument()
    expect(within(guide).getByText('Horizontal axis: time')).toBeInTheDocument()
    expect(guide).toHaveTextContent('W/m² means watts per square metre.')
    expect(guide).toHaveTextContent('UTC (Coordinated Universal Time)')
    expect(guide).toHaveTextContent('1E-7 equals 0.0000001.')
  })

  test('does not explain watts per square metre for data with a different unit', () => {
    renderWithIntl(
      <ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} unit="mW/m²" />,
    )

    expect(screen.getByText('Flujo (mW/m²)')).toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Cómo leer esta gráfica' })).not.toBeInTheDocument()
  })

  test('reads out a point from the keyboard with a single tab stop', async () => {
    const user = userEvent.setup()
    renderWithIntl(<ScientificDataChart {...(XrayFlare.args as ScientificDataChartProps)} />)
    const area = screen.getByRole('region', { name: /Área de gráfica/ })

    expect(area).toHaveAccessibleDescription(/flechas izquierda y derecha/)
    await user.tab()
    expect(area).toHaveFocus()
    expect(screen.getByText(/^08:30 UTC: 3,35E-5 W\/m²$/)).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(/^08:45 UTC: 6,1E-6 W\/m²$/)).toBeInTheDocument()
    await user.keyboard('{Home}')
    expect(screen.getByText(/^08:00 UTC: 2,1E-7 W\/m²$/)).toBeInTheDocument()
    await user.keyboard('{End}')
    expect(screen.getByText(/^09:00 UTC: 8,4E-7 W\/m²$/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText(/UTC: .* W\/m²$/)).not.toBeInTheDocument()
  })
})
