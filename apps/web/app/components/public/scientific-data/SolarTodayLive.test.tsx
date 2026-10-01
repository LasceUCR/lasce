import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { findScientificProduct, type ScientificProductCode } from '@/app/lib/scientific-data'
import { SolarTodayLive } from './SolarTodayLive'
import { Default } from './SolarToday.stories'

const instrument = Default.args!.instrument!
const now = '2026-09-25T12:30:00.000Z'
function result(product: ScientificProductCode = 'Fe195', count = 8) {
  const selection = findScientificProduct('GOES', product)!
  return {
    query: {
      source: 'GOES',
      product,
      parameter: 'image',
      date: '2026-09-25',
      startTime: '00:00',
      endTime: '12:30',
    },
    instrument: { code: instrument.code, name: instrument.name },
    product: { code: product, name: selection.product.name },
    parameter: selection.product.parameters[0],
    origin: { kind: 'observed', provider: 'GOES', notice: 'Fuente: GOES.' },
    visualization: 'image-sequence',
    images: Array.from({ length: count }, (_, index) => ({
      timestamp: `2026-09-25T${String(index).padStart(2, '0')}:00:00Z`,
      imageUrl: `https://services.swpc.noaa.gov/test-${product}-${index}.png`,
      alt: `${product} imagen ${index}`,
    })),
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('SolarTodayLive', () => {
  test('loads today automatically and selects five moments including both ends', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => result() })
    vi.stubGlobal('fetch', fetchMock)
    render(<SolarTodayLive instrument={instrument} initialNow={now} />)
    expect(await screen.findAllByRole('img')).toHaveLength(5)
    expect(screen.getByRole('img', { name: 'Fe195 imagen 0' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fe195 imagen 7' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/scientific-data?source=GOES&product=Fe195&parameter=image&date=2026-09-25&startTime=00%3A00&endTime=12%3A30',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
  test('changes range within today and requests the selected band without submission', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => result('Fe171', 3) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SolarTodayLive instrument={instrument} initialNow={now} />)
    await screen.findByRole('list')
    await user.click(screen.getByRole('combobox', { name: 'Rango de hoy (UTC)' }))
    await user.click(screen.getByRole('option', { name: 'Últimas 3 horas' }))
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toContain('startTime=09%3A30'))
    await user.click(screen.getByRole('radio', { name: '171 Å' }))
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toContain('product=Fe171'))
    expect(screen.getByRole('radio', { name: '171 Å' })).toBeChecked()
  })
  test('discards a superseded response when visitors change bands during loading', async () => {
    let resolvePrevious!: (value: unknown) => void
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolvePrevious = done
          }),
      )
      .mockResolvedValueOnce({ ok: true, json: async () => result('Fe171') })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SolarTodayLive instrument={instrument} initialNow={now} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('radio', { name: '171 Å' }))
    await screen.findByRole('img', { name: 'Fe171 imagen 0' })
    expect(fetchMock.mock.calls[0]![1].signal.aborted).toBe(true)
    await act(async () => resolvePrevious({ ok: true, json: async () => result() }))
    expect(screen.queryByRole('img', { name: 'Fe195 imagen 0' })).not.toBeInTheDocument()
  })
  test('recovers from source errors and empty bands using the same controls', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => result('Fe171', 0) })
      .mockResolvedValueOnce({ ok: true, json: async () => result('Fe171', 3) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<SolarTodayLive instrument={instrument} initialNow={now} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar')
    await user.click(screen.getByRole('radio', { name: '171 Å' }))
    await screen.findByText('Aún no hay imágenes para esta selección')
    await user.click(screen.getByRole('button', { name: 'Actualizar imágenes' }))
    expect(await screen.findAllByRole('img')).toHaveLength(3)
  })
  test('does not replace today with yesterday at UTC midnight', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<SolarTodayLive instrument={instrument} initialNow="2026-09-25T00:00:00.000Z" />)
    await screen.findByText('Aún no hay imágenes para esta selección')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
