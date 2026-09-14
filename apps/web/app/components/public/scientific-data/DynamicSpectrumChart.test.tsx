import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { DynamicSpectrumChart, type DynamicSpectrumChartProps } from './DynamicSpectrumChart'
import { Default } from './DynamicSpectrumChart.stories'

describe('DynamicSpectrumChart', () => {
  test('describes both axes and the simulated value range without relying on color', () => {
    render(<DynamicSpectrumChart {...(Default.args as DynamicSpectrumChartProps)} />)

    const chart = screen.getByRole('img', { name: 'Espectro dinámico simulado de ROSAC' })
    expect(chart).toHaveAccessibleDescription(/desde 100 hasta 200 MHz/)
    expect(chart).toHaveAccessibleDescription(/12.00 a 42.00 intensidad relativa/)
    expect(screen.getByText(/Frecuencia en MHz/)).toBeInTheDocument()
  })
})
