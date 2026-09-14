import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NoaaSource from '@/app/services/scientific-data/noaaScientificDataSource'

const mocks = vi.hoisted(() => ({
  queryMockScientificData: vi.fn(),
  queryNoaaScientificData: vi.fn(),
}))

vi.mock('@/app/services/scientific-data/mockScientificDataSource', () => ({
  queryMockScientificData: mocks.queryMockScientificData,
}))

vi.mock('@/app/services/scientific-data/noaaScientificDataSource', async (importOriginal) => {
  const original = await importOriginal<typeof NoaaSource>()
  return { ...original, queryNoaaScientificData: mocks.queryNoaaScientificData }
})

import { GET } from './route'

function request(parameters: Record<string, string>) {
  return new Request(`http://localhost/api/scientific-data?${new URLSearchParams(parameters)}`)
}

const validGoesQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/scientific-data', () => {
  test('routes a valid GOES query to the observed NOAA adapter', async () => {
    const expected = { visualization: 'time-series', points: [] }
    mocks.queryNoaaScientificData.mockResolvedValue(expected)

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(expected)
    expect(mocks.queryNoaaScientificData).toHaveBeenCalledWith(validGoesQuery)
    expect(mocks.queryMockScientificData).not.toHaveBeenCalled()
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
    expect(mocks.queryNoaaScientificData).not.toHaveBeenCalled()
  })

  test('rejects invalid source/product combinations before querying a source', async () => {
    const response = await GET(request({ ...validGoesQuery, source: 'ROSAC' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Los criterios de consulta no son válidos.',
    })
    expect(mocks.queryNoaaScientificData).not.toHaveBeenCalled()
    expect(mocks.queryMockScientificData).not.toHaveBeenCalled()
  })

  test('returns a stable gateway error when NOAA is unavailable', async () => {
    const { ScientificDataUpstreamError } =
      await import('@/app/services/scientific-data/noaaScientificDataSource')
    mocks.queryNoaaScientificData.mockRejectedValue(new ScientificDataUpstreamError('offline'))

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/NOAA/) })
  })
})
