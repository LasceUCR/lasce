import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NoaaSource from '@/app/services/scientific-data/noaaScientificDataSource'

const mocks = vi.hoisted(() => ({
  queryMockScientificData: vi.fn(),
  queryNoaaScientificData: vi.fn(),
  queryCiticScientificData: vi.fn(),
}))

vi.mock('@/app/services/scientific-data/mockScientificDataSource', () => ({
  queryMockScientificData: mocks.queryMockScientificData,
}))

vi.mock('@/app/services/scientific-data/noaaScientificDataSource', async (importOriginal) => {
  const original = await importOriginal<typeof NoaaSource>()
  return { ...original, queryNoaaScientificData: mocks.queryNoaaScientificData }
})

vi.mock('@/app/services/scientific-data/citicScientificDataSource', () => ({
  queryCiticScientificData: mocks.queryCiticScientificData,
}))

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
  test('keeps SUVI on the NOAA image source', async () => {
    mocks.queryNoaaScientificData.mockResolvedValue({ visualization: 'image-sequence', images: [] })
    const suvi = { ...validGoesQuery, product: 'Fe171', parameter: 'image' }
    const response = await GET(request(suvi))
    expect(response.status).toBe(200)
    expect(mocks.queryNoaaScientificData).toHaveBeenCalledWith(suvi)
    expect(mocks.queryCiticScientificData).not.toHaveBeenCalled()
  })

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
  test('routes a valid GOES query to the CITIC historical adapter', async () => {
    const expected = { visualization: 'time-series', points: [] }
    mocks.queryCiticScientificData.mockResolvedValue(expected)

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(expected)
    expect(mocks.queryCiticScientificData).toHaveBeenCalledWith(validGoesQuery, undefined)
    expect(mocks.queryNoaaScientificData).not.toHaveBeenCalled()
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

  test('returns a stable gateway error when CITIC is unavailable', async () => {
    const { ScientificDataUpstreamError } =
      await import('@/app/services/scientific-data/noaaScientificDataSource')
    mocks.queryCiticScientificData.mockRejectedValue(new ScientificDataUpstreamError('offline'))

    const response = await GET(request(validGoesQuery))

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/fuente científica/),
    })
  })
})
