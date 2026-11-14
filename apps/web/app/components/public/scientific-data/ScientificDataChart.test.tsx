import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { describe, expect, test } from 'vitest'

import { ScientificDataChart } from './ScientificDataChart'
import { Default, Empty, SinglePoint, XrayFlare } from './ScientificDataChart.stories'
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
    expect(screen.getByText(/Observaciones de GOES/)).toHaveTextContent(/escala logarítmica/)
    expect(screen.getByText(/Observaciones de GOES/)).toHaveTextContent(/clases de fulguración/)
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
