import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { scientificSources } from '@/app/lib/scientific-data'
import {
  ScientificDataUpstreamError,
  UnsupportedScientificQueryError,
} from '@/app/services/scientific-data/errors'

const mocks = vi.hoisted(() => ({
  queryMockScientificData: vi.fn(),
  querySuviFrames: vi.fn(),
  queryExisReadings: vi.fn(),
  queryCiticScientificData: vi.fn(),
}))

vi.mock('@/app/services/scientific-data/mockScientificDataSource', () => ({
  queryMockScientificData: mocks.queryMockScientificData,
}))

vi.mock('@/app/services/scientific-data/suviFrameDataSource', () => ({
  querySuviFrames: mocks.querySuviFrames,
}))

vi.mock('@/app/services/scientific-data/exisReadingsDataSource', () => ({
  queryExisReadings: mocks.queryExisReadings,
}))

vi.mock('@/app/services/scientific-data/citicScientificDataSource', () => ({
  queryCiticScientificData: mocks.queryCiticScientificData,
}))

import { GET } from './route'

const availableProducts = scientificSources.flatMap((source) =>
  source.instruments.flatMap((instrument) =>
    instrument.products
      .filter((product) => product.available)
      .map((product) => ({
        source: source.code,
        instrument: instrument.code,
        product: product.code,
        parameter: product.parameters[0]!.code,
      })),
  ),
)

function request(parameters: Record<string, string>) {
  return new Request(`http://localhost/api/scientific-data?${new URLSearchParams(parameters)}`)
}

// A MAG product: the GOES instrument family still read on demand through CITIC.
const validGoesQuery = {
  source: 'GOES',
  product: 'GEOF',
  parameter: 'total',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-10T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('GET /api/scientific-data', () => {
  test('rejects SUVI on a future date before querying the frame archive', async () => {
    const response = await GET(
      request({ ...validGoesQuery, product: 'Fe171', parameter: 'image', date: '2026-09-11' }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('posterior a hoy'),
    })
    expect(mocks.querySuviFrames).not.toHaveBeenCalled()
  })
  test.each(['2026-09-10', '2025-01-05'])(
    'routes SUVI on %s to the frame archive',
    async (date) => {
      mocks.querySuviFrames.mockResolvedValue({ visualization: 'image-sequence', images: [] })
      const suvi = { ...validGoesQuery, product: 'Fe171', parameter: 'image', date }
      const response = await GET(request(suvi))
      expect(response.status).toBe(200)
      expect(mocks.querySuviFrames).toHaveBeenCalledWith(suvi)
      expect(mocks.queryCiticScientificData).not.toHaveBeenCalled()
    },
  )

  test('returns pending progress and forwards the poll identifier to CITIC', async () => {
    mocks.queryCiticScientificData.mockResolvedValue({
      state: 'pending',
      jobId: 'goes-1',
      progress: 20,
    })
    const response = await GET(request({ ...validGoesQuery, jobId: 'goes-1' }))
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ state: 'pending', progress: 20 })
    expect(mocks.queryCiticScientificData).toHaveBeenCalledWith(validGoesQuery, 'goes-1')
  })
  test('routes a MAG query to the CITIC historical adapter', async () => {
    const expected = { visualization: 'time-series', points: [] }
    mocks.queryCiticScientificData.mockResolvedValue(expected)

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(expected)
    expect(mocks.queryCiticScientificData).toHaveBeenCalledWith(validGoesQuery, undefined)
    expect(mocks.querySuviFrames).not.toHaveBeenCalled()
    expect(mocks.queryExisReadings).not.toHaveBeenCalled()
    expect(mocks.queryMockScientificData).not.toHaveBeenCalled()
  })

  test.each([
    ['SFXR', '0.1-0.8nm'],
    ['SFEU', 'mgii_index'],
  ])('routes EXIS %s to the InfluxDB readings synchronously', async (product, parameter) => {
    const expected = { visualization: 'time-series', points: [] }
    mocks.queryExisReadings.mockResolvedValue(expected)
    const exis = { ...validGoesQuery, product, parameter }

    const response = await GET(request(exis))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expected)
    expect(mocks.queryExisReadings).toHaveBeenCalledWith(exis)
    expect(mocks.queryCiticScientificData).not.toHaveBeenCalled()
  })

  test('routes a valid ROSAC query only to the simulated adapter', async () => {
    const rosacQuery = {
      source: 'ROSAC',
      product: 'ROSAC-I2',
      parameter: 'simulated-spectrum',
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '09:00',
    }
    mocks.queryMockScientificData.mockResolvedValue({
      visualization: 'dynamic-spectrum',
      cells: [],
    })

    const response = await GET(request(rosacQuery))

    expect(response.status).toBe(200)
    expect(mocks.queryMockScientificData).toHaveBeenCalledWith(rosacQuery)
    expect(mocks.querySuviFrames).not.toHaveBeenCalled()
  })

  test('rejects invalid source/product combinations before querying a source', async () => {
    const response = await GET(request({ ...validGoesQuery, source: 'ROSAC' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Los criterios de consulta no son válidos.',
    })
    expect(mocks.querySuviFrames).not.toHaveBeenCalled()
    expect(mocks.queryMockScientificData).not.toHaveBeenCalled()
  })

  test.each(availableProducts)(
    'registers a provider for every available product: $source $instrument $product',
    async ({ source, product, parameter }) => {
      for (const adapter of Object.values(mocks)) adapter.mockResolvedValue({ points: [] })

      const response = await GET(request({ ...validGoesQuery, source, product, parameter }))

      expect(response.status).toBe(200)
    },
  )

  test('returns a stable server error when a product has no registered provider', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.queryCiticScientificData.mockRejectedValue(
      new UnsupportedScientificQueryError('No provider is registered for GOES product GEOF'),
    )

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      error: 'La fuente científica no está disponible en este momento.',
    })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('No provider is registered'))
    consoleError.mockRestore()
  })

  test('returns a stable gateway error when CITIC is unavailable', async () => {
    mocks.queryCiticScientificData.mockRejectedValue(new ScientificDataUpstreamError('offline'))

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/fuente científica/),
    })
  })
})
