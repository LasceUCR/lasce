import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ScientificDataChart } from './ScientificDataChart'
import { Empty, SinglePoint } from './ScientificDataChart.stories'
import type { ScientificDataChartProps } from './ScientificDataChart'
import { type ScientificDataExplorerProps } from './ScientificDataExplorer'
import { WithObservedResults } from './ScientificDataExplorer.stories'

const resultFixture = (WithObservedResults.args as ScientificDataExplorerProps).initialResult!

describe('ScientificDataChart', () => {
  test('handles a source with no values without rendering an invalid plot', () => {
    render(<ScientificDataChart {...(Empty.args as ScientificDataChartProps)} />)
    expect(screen.getByRole('status')).toHaveTextContent('No hay valores para graficar.')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('describes a single available observation', () => {
    render(<ScientificDataChart {...(SinglePoint.args as ScientificDataChartProps)} />)
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/Serie de 1 mediciones/)
  })
  test('describes the visualized series through the accessibility tree', () => {
    if (resultFixture.visualization !== 'time-series') throw new Error('Expected a time series')

    render(
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
})
