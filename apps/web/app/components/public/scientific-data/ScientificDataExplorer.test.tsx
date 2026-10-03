import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ScientificDataExplorer, type ScientificDataExplorerProps } from './ScientificDataExplorer'
import {
  Default,
  WithDownloadsForGoesDataHolder,
  WithDownloadsForVisitor,
  WithDownloadsSignedOut,
  WithObservedResults,
  WithRosacDownloads,
  WithRosacDynamicSpectrum,
  WithoutResults,
  WithSuviAndAllGrants,
  WithSuviImages,
} from './ScientificDataExplorer.stories'

const defaultArgs = Default.args as ScientificDataExplorerProps
const withResultsArgs = WithObservedResults.args as ScientificDataExplorerProps
const withoutResultsArgs = WithoutResults.args as ScientificDataExplorerProps
const spectrumArgs = WithRosacDynamicSpectrum.args as ScientificDataExplorerProps
const resultFixture = withResultsArgs.initialResult!
const suviArgs = WithSuviImages.args as ScientificDataExplorerProps
const visitorDownloadArgs = WithDownloadsForVisitor.args as ScientificDataExplorerProps
const goesHolderDownloadArgs = WithDownloadsForGoesDataHolder.args as ScientificDataExplorerProps
const signedOutDownloadArgs = WithDownloadsSignedOut.args as ScientificDataExplorerProps
const rosacDownloadArgs = WithRosacDownloads.args as ScientificDataExplorerProps
const suviDownloadArgs = WithSuviAndAllGrants.args as ScientificDataExplorerProps

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ScientificDataExplorer', () => {
  test('accepts historical dates and lets visitors stop waiting for a pending query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ state: 'pending', jobId: 'goes-test', progress: 25 }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...defaultArgs}
        initialQuery={{ ...defaultArgs.initialQuery, date: '2025-01-05' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando datos')
    expect(screen.getByRole('progressbar', { name: 'Cargando datos' })).toHaveAttribute(
      'value',
      '25',
    )
    expect(fetchMock.mock.calls[0]![0]).toContain('date=2025-01-05')
    await user.click(screen.getByRole('button', { name: 'Cancelar consulta' }))
    expect(screen.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
    expect(fetchMock.mock.calls[0]![1].signal.aborted).toBe(true)
  })
  test('offers observed GOES products and identifies products not yet integrated', async () => {
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    expect(screen.getByRole('combobox', { name: 'Fuente de datos' })).toHaveValue('GOES')
    const product = screen.getByRole('combobox', { name: 'Instrumento y producto' })
    await user.click(product)
    const options = screen.getByRole('tree', { name: 'Instrumento y producto' })
    expect(within(options).getAllByRole('treeitem')).toHaveLength(4)
    await user.click(within(options).getByRole('treeitem', { name: /^EXIS/ }))
    expect(product).toHaveValue('SFXR')
    expect(within(options).getByRole('treeitem', { name: /EUV/ })).toBeInTheDocument()
    expect(product).toHaveTextContent('EXIS')
    expect(product).toHaveTextContent('Sensores de irradiancia ultravioleta extrema y rayos X')
    expect(
      screen.queryByRole('combobox', { name: 'Instrumento científico' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('treeitem', { name: /^SEISS/ }))
    expect(product).toHaveValue('SFXR')
    expect(within(options).queryByRole('treeitem', { name: /EUV/ })).not.toBeInTheDocument()
    expect(
      within(options).getByRole('treeitem', { name: /Iones pesados energéticos/ }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(within(options).getByRole('treeitem', { name: /baja energía/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.click(within(options).getByRole('treeitem', { name: /media y alta/ }))
    expect(product).toHaveValue('MPSH')
    expect(screen.getByRole('combobox', { name: 'Canal o parámetro' })).toHaveValue(
      'electron:T1:E1',
    )
    expect(screen.getByLabelText('Fecha')).not.toHaveAttribute('min')
    expect(screen.getByText('Datos observados')).toBeInTheDocument()
  })

  test('switches to provisional ROSAC instruments without presenting them as observations', async () => {
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    await user.click(screen.getByRole('combobox', { name: 'Fuente de datos' }))
    await user.click(screen.getByRole('option', { name: /ROSAC/ }))

    expect(screen.getByText('Simulación')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveValue('ROSAC-I1')
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveTextContent(
      'ROSAC-I1',
    )
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
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(within(results).getByRole('img', { name: /Gráfica de Flujo solar/ })).toBeInTheDocument()
    expect(within(results).getByText('08:00–09:00 UTC')).toBeInTheDocument()
    expect(within(results).getByText(/Observaciones históricas/)).toBeInTheDocument()
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

    const endTime = screen.getByLabelText('Hora de fin (UTC)')
    await user.clear(endTime)
    await user.type(endTime, '08:00')
    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La hora de inicio debe ser anterior a la hora de fin.',
    )
    expect(screen.getByLabelText('Hora de inicio (UTC)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Hora de fin (UTC)')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('keeps the form available when CITIC has no matching data', () => {
    render(<ScientificDataExplorer {...withoutResultsArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent('No hay datos disponibles')
    expect(screen.getByRole('button', { name: 'Consultar datos' })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toBeEnabled()
    expect(screen.queryByRole('img', { name: /Gráfica/ })).not.toBeInTheDocument()
  })

  test('shows a GOES-specific error when the observed source fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible consultar la fuente GOES en este momento.',
    )
  })

  test('renders supplied observations without requesting data', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ScientificDataExplorer {...withResultsArgs} />)

    expect(screen.getByRole('region', { name: 'Flujo solar: rayos X (SFXR)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /descargar/i })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('explains consultation and download permissions before any request', () => {
    render(<ScientificDataExplorer {...defaultArgs} />)
    const banner = screen.getByRole('complementary', { name: 'Permisos de consulta y descarga' })
    expect(banner).toHaveTextContent('Puede consultar información histórica de GOES sin una cuenta')
    expect(banner).toHaveTextContent('Para descargar, necesita una cuenta e iniciar sesión')
    expect(banner).toHaveTextContent('los de GOES requieren un permiso de descarga de datos GOES')
    expect(banner).toHaveTextContent('Las imágenes solares SUVI no se pueden descargar')
    expect(banner).toHaveTextContent('Cada enlace de descarga vence en 30 minutos')
  })

  test('offers the GOES chart image but not GOES data without the GOES data grant', () => {
    render(<ScientificDataExplorer {...visitorDownloadArgs} />)

    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Descargar datos (CSV)' })).not.toBeInTheDocument()
  })

  test('offers GOES data to a holder of the GOES data grant', () => {
    render(<ScientificDataExplorer {...goesHolderDownloadArgs} />)

    expect(screen.getByRole('button', { name: 'Descargar datos (CSV)' })).toBeEnabled()
  })

  test('requests the shown query and opens the returned link', async () => {
    const requestDownload = vi.fn().mockResolvedValue({
      ok: true,
      url: 'http://minio/signed',
      filename: 'GOES_EXIS_SFXR.png',
      expiresAt: '2026-09-10T10:00:00.000Z',
    })
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...visitorDownloadArgs}
        navigate={navigate}
        requestDownload={requestDownload}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' }))

    expect(requestDownload).toHaveBeenCalledWith({ query: resultFixture.query, format: 'png' })
    expect(navigate).toHaveBeenCalledWith('http://minio/signed')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'La descarga de GOES_EXIS_SFXR.png comenzó. El enlace vence en 30 minutos.',
    )
  })

  test('sends anonymous visitors to sign in instead of requesting a download', async () => {
    const requestDownload = vi.fn()
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...signedOutDownloadArgs}
        loginHref="/acceso?next=%2Fdatos&reason=auth"
        navigate={navigate}
        requestDownload={requestDownload}
      />,
    )

    expect(screen.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Inicie sesión para descargar la gráfica' }),
    )

    expect(requestDownload).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/acceso?next=%2Fdatos&reason=auth')
  })

  test('sends a visitor whose session expired to sign in', async () => {
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...visitorDownloadArgs}
        loginHref="/acceso"
        navigate={navigate}
        requestDownload={vi.fn().mockResolvedValue({
          ok: false,
          reason: 'unauthenticated',
          message: 'Inicie sesión para descargar recursos.',
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' }))

    expect(navigate).toHaveBeenCalledWith('/acceso')
  })

  test('shows why a download was refused and lets the visitor try again', async () => {
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...visitorDownloadArgs}
        requestDownload={vi.fn().mockResolvedValue({
          ok: false,
          reason: 'failed',
          message: 'No fue posible preparar la descarga. Inténtelo nuevamente más tarde.',
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible preparar la descarga.',
    )
    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
  })

  test('reports a download that could not reach the server', async () => {
    const user = userEvent.setup()
    render(
      <ScientificDataExplorer
        {...visitorDownloadArgs}
        requestDownload={vi.fn().mockRejectedValue(new Error('offline'))}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible preparar la descarga. Inténtelo nuevamente más tarde.',
    )
  })

  test('reuses the job that answered an asynchronous query for its download', async () => {
    const pending = { state: 'pending', jobId: 'goes-job-1', progress: 50 }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 202, json: async () => pending })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => resultFixture }),
    )
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const requestDownload = vi.fn().mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ScientificDataExplorer
        {...visitorDownloadArgs}
        initialResult={undefined}
        requestDownload={requestDownload}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))
    await vi.advanceTimersByTimeAsync(2000)
    await user.click(await screen.findByRole('button', { name: 'Descargar gráfica (PNG)' }))
    vi.useRealTimers()

    expect(requestDownload).toHaveBeenCalledWith({
      query: resultFixture.query,
      format: 'png',
      jobId: 'goes-job-1',
    })
    expect(screen.getByRole('button', { name: 'Preparando descarga…' })).toBeDisabled()
  })

  test('offers ROSAC data to every account', () => {
    render(<ScientificDataExplorer {...rosacDownloadArgs} />)

    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Descargar datos (CSV)' })).toBeEnabled()
  })

  test('offers no download for SUVI images, whatever the grants', () => {
    render(<ScientificDataExplorer {...suviDownloadArgs} />)

    expect(screen.queryByRole('button', { name: /descargar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Descargas' })).not.toBeInTheDocument()
  })

  test('identifies the source only as GOES while preserving observation notices', () => {
    render(<ScientificDataExplorer {...withResultsArgs} />)
    expect(screen.getByRole('combobox', { name: 'Fuente de datos' })).toHaveTextContent(/^GOES$/)
    expect(screen.getByText(/Observaciones de GOES\./)).toBeInTheDocument()
    expect(screen.queryByText(/CITIC|LASCE|NOAA/)).not.toBeInTheDocument()
  })

  test('switches instruments and their parameters without requesting observations', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)
    const product = screen.getByRole('combobox', { name: 'Instrumento y producto' })
    await user.click(product)
    await user.click(screen.getByRole('treeitem', { name: /^MAG/ }))
    expect(product).toHaveValue('SFXR')
    await user.click(screen.getByRole('treeitem', { name: /Campo geomagnético/ }))
    expect(product).toHaveTextContent('Magnetómetro')
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveValue('GEOF')
    expect(screen.getByRole('combobox', { name: 'Canal o parámetro' })).toHaveValue('EPN-x')
    await user.click(product)
    await user.click(screen.getByRole('treeitem', { name: /^EXIS/ }))
    await user.click(screen.getByRole('treeitem', { name: /EUV/ }))
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveValue('SFEU')
    expect(screen.getByRole('combobox', { name: 'Canal o parámetro' })).toHaveValue('1175')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('queries the selected EXIS product and channel through the unchanged API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => resultFixture })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...defaultArgs} />)
    await user.click(screen.getByRole('combobox', { name: 'Instrumento y producto' }))
    await user.click(screen.getByRole('treeitem', { name: /^EXIS/ }))
    await user.click(screen.getByRole('treeitem', { name: /EUV/ }))
    expect(screen.getByRole('combobox', { name: 'Canal o parámetro' })).toHaveValue('1175')
    await user.click(screen.getByRole('button', { name: 'Consultar datos' }))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('product=SFEU&parameter=1175'),
      expect.anything(),
    )
  })

  test('keeps manual SUVI consultation without loading images until submission', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<ScientificDataExplorer {...suviArgs} initialResult={undefined} />)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveTextContent(
      'SUVI',
    )
    await user.click(screen.getByRole('combobox', { name: 'Instrumento y producto' }))
    await user.click(screen.getByRole('treeitem', { name: /^SUVI/ }))
    await user.click(screen.getByRole('treeitem', { name: /195 Å/ }))
    expect(screen.getByRole('combobox', { name: 'Instrumento y producto' })).toHaveValue('Fe195')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
