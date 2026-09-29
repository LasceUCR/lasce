import { describe, expect, test } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { buildGoesTimeSeriesResult } from '@/app/services/scientific-data/goesTimeSeriesResult'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}
const points = [{ timestamp: '2026-09-10T08:00:00Z', value: 0.001 }]

describe('GOES time-series result', () => {
  test('describes the catalog product and observed provenance of the points', () => {
    expect(
      buildGoesTimeSeriesResult(query, points, { provider: 'P', notice: 'N', satellite: 19 }),
    ).toEqual({
      query,
      instrument: { code: 'EXIS', name: expect.any(String) },
      product: { code: 'SFXR', name: 'Flujo solar: rayos X' },
      parameter: expect.objectContaining({ code: '0.1-0.8nm', unit: 'W/m²' }),
      visualization: 'time-series',
      points,
      origin: { kind: 'observed', provider: 'P', notice: 'N', satellite: 19 },
    })
  })

  test('omits the satellite when the backend did not report one', () => {
    const result = buildGoesTimeSeriesResult(query, points, {
      provider: 'P',
      notice: 'N',
      satellite: null,
    })
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses products that are not GOES time series', () => {
    const origin = { provider: 'P', notice: 'N', satellite: null }
    expect(() =>
      buildGoesTimeSeriesResult({ ...query, product: 'Fe171', parameter: 'image' }, [], origin),
    ).toThrow(/GOES time series/)
    expect(() => buildGoesTimeSeriesResult({ ...query, source: 'ROSAC' }, [], origin)).toThrow(
      /GOES time series/,
    )
  })
})
