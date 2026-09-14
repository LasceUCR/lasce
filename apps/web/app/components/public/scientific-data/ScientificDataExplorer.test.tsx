import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ScientificDataExplorer, type ScientificDataExplorerProps } from './ScientificDataExplorer'
import {
  Default,
  WithObservedResults,
  WithRosacDynamicSpectrum,
  WithoutResults,
} from './ScientificDataExplorer.stories'

const defaultArgs = Default.args as ScientificDataExplorerProps
const withResultsArgs = WithObservedResults.args as ScientificDataExplorerProps
const withoutResultsArgs = WithoutResults.args as ScientificDataExplorerProps
const spectrumArgs = WithRosacDynamicSpectrum.args as ScientificDataExplorerProps
const resultFixture = withResultsArgs.initialResult!

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ScientificDataExplorer', () => {
  test('offers observed GOES products and identifies products not yet integrated', () => {
    render(<ScientificDataExplorer {...defaultArgs} />)

    expect(screen.getByRole('combobox', { name: 'Fuente de datos' })).toHaveValue('GOES')
    const product = screen.getByRole('combobox', { name: 'Producto científico' })
    expect(within(product).getAllByRole('option')).toHaveLength(13)
    expect(product).toHaveValue('SFXR')
    expect(
      within(product).getByRole('option', { name: /Iones pesados energéticos/ }),
    ).toBeDisabled()
    expect(within(product).getByRole('option', { name: /baja energía/ })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Canal o parámetro' })).toHaveValue('0.1-0.8nm')
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('min', '2026-09-04')
    expect(screen.getByText('Datos observados')).toBeInTheDocument()
    expect(screen.getByText(/Instrumento: EXIS/)).toBeInTheDocument()
  })

  test('switches to provisional ROSAC instruments without presenting them as observations', async () => {
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Fuente de datos' }), 'ROSAC')

    expect(screen.getByText('Simulación')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Producto científico' })).toHaveValue('ROSAC-I1')
    expect(screen.getByText(/Instrumento: ROSAC-I1 — Instrumento 1/)).toBeInTheDocument()
    expect(
      screen.getByText(/instrumentos y datos reales aún no están definidos/i),
    ).toBeInTheDocument()
  })

  test('queries and visualizes the exact selected GOES criteria', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => resultFixture,
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))

    const results = await screen.findByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scientific-data?source=GOES&product=SFXR&parameter=0.1-0.8nm&date=2026-09-10&startTime=08%3A00&endTime=09%3A00',
    )
    expect(within(results).getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeInTheDocument()
    expect(within(results).getByText('08:00–09:00 UTC')).toBeInTheDocument()
    expect(within(results).getByText(/Datos observados del servicio público/)).toBeInTheDocument()
    expect(within(results).queryByRole('link')).not.toBeInTheDocument()
  })

  test('renders a ROSAC dynamic spectrum with an accessible values table', () => {
    render(<ScientificDataExplorer {...spectrumArgs} />)

    const results = screen.getByRole('region', { name: 'Espectro dinámico de prueba (ROSAC-I2)' })
    expect(
      within(results).getByRole('img', { name: 'Espectro dinámico simulado de ROSAC' }),
    ).toBeInTheDocument()
    expect(within(results).getByText('Ver valores del espectro (4)')).toBeInTheDocument()
    expect(within(results).getByText(/Datos simulados para preparar/)).toBeInTheDocument()
  })

  test('rejects an equal or decreasing time range before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    const endTime = screen.getByLabelText('Hora de fin')
    await user.clear(endTime)
    await user.type(endTime, '08:00')
    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La hora de inicio debe ser anterior a la hora de fin.',
    )
    expect(screen.getByLabelText('Hora de inicio')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Hora de fin')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('keeps the form available when NOAA has no matching data', () => {
    render(<ScientificDataExplorer {...withoutResultsArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent('No hay datos disponibles')
    expect(screen.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: 'Producto científico' })).toBeEnabled()
    expect(screen.queryByRole('img', { name: /Gráfica/ })).not.toBeInTheDocument()
  })

  test('shows a NOAA-specific error when the observed source fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible consultar NOAA en este momento.',
    )
  })

  test('renders supplied observations without requesting data or exposing downloads', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ScientificDataExplorer {...withResultsArgs} />)

    expect(screen.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /descargar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /descargar/i })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
