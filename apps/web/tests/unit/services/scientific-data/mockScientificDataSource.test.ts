import { describe, expect, test } from 'vitest'

import { queryMockScientificData } from '@/app/services/scientific-data/mockScientificDataSource'

describe('queryMockScientificData', () => {
  test('limits simulated time-series data to the provisional ROSAC source', async () => {
    const result = await queryMockScientificData({
      source: 'ROSAC',
      product: 'ROSAC-I1',
      parameter: 'simulated-intensity',
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '09:00',
    })

    expect(result).toMatchObject({
      instrument: { code: 'ROSAC-I1' },
      product: { code: 'ROSAC-I1' },
      origin: { kind: 'simulated' },
      visualization: 'time-series',
    })
    if (result.visualization !== 'time-series') throw new Error('Expected a time series')

    expect(result.points).toHaveLength(5)
    expect(result.points[0]!.timestamp).toBe('2026-09-10T08:00:00Z')
    expect(result.points.at(-1)!.timestamp).toBe('2026-09-10T09:00:00Z')
  })

  test('creates a time-frequency matrix for the provisional dynamic spectrum', async () => {
    const result = await queryMockScientificData({
      source: 'ROSAC',
      product: 'ROSAC-I2',
      parameter: 'simulated-spectrum',
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '08:20',
    })

    expect(result.visualization).toBe('dynamic-spectrum')
    if (result.visualization !== 'dynamic-spectrum') throw new Error('Expected a spectrum')

    expect(result.timestamps).toHaveLength(3)
    expect(result.frequencies).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])
    expect(result.cells).toHaveLength(30)
    expect(result.origin.notice).toMatch(/simulados/i)
  })

  test('rejects attempts to fabricate GOES data', async () => {
    await expect(
      queryMockScientificData({
        source: 'GOES',
        product: 'SFXR',
        parameter: '0.1-0.8nm',
        date: '2026-09-10',
        startTime: '08:00',
        endTime: '09:00',
      }),
    ).rejects.toThrow('only accepts provisional ROSAC products')
  })
})
