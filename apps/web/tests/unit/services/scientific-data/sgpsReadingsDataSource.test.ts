import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({ queryInfluxSql: vi.fn() }))

vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))

import { querySgpsReadings } from '@/app/services/scientific-data/sgpsReadingsDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'SGPS',
  parameter: 'plus:P1',
  date: '2026-10-27',
  startTime: '00:00',
  endTime: '23:59',
}

function reading(time: string, value: number, n: number, satellite = 'G19') {
  return { time, value, satellite, n }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('querySgpsReadings', () => {
  test('reads the stored proton flux with bound params and only valid readings', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await querySgpsReadings(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(params).toEqual({
      product: 'SGPS',
      channel: 'plus:P1',
      start: '2026-10-27T00:00:00Z',
      end: '2026-10-27T23:59:59.999Z',
    })
    expect(sql).toContain('FROM sgps_flux')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('plus:P1')
  })

  test.each([
    ['plus:P1', 'protones/(cm²·s·sr·keV)'],
    ['minus:P11', 'pfu'],
  ])('returns %s in its catalogue unit as an observed GOES-19 series', async (parameter, unit) => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-10-27T00:00:00', 0.0036, 2),
      reading('2026-10-27T00:01:00', 0.0031, 2),
    ])

    const result = await querySgpsReadings({ ...query, parameter })

    expect(result).toMatchObject({
      visualization: 'time-series',
      instrument: { code: 'SEISS' },
      product: { code: 'SGPS' },
      parameter: { code: parameter, unit },
      origin: { kind: 'observed', satellite: 19 },
      points: [
        { timestamp: '2026-10-27T00:00:00Z', value: 0.0036 },
        { timestamp: '2026-10-27T00:01:00Z', value: 0.0031 },
      ],
    })
    expect(result.origin.provider).toContain('SGPS')
    expect(result.origin.notice).toContain('sin muestras válidas')
  })

  test('announces sampling for a full day of 1-minute readings', async () => {
    const rows = Array.from({ length: 361 }, (_, index) =>
      reading(new Date(Date.UTC(2026, 9, 27, 0, index * 4)).toISOString(), index, 1440),
    )
    mocks.queryInfluxSql.mockResolvedValue(rows)

    const result = await querySgpsReadings(query)

    expect(result.points).toHaveLength(360)
    expect(result.origin.notice).toContain('distribuidas uniformemente')
  })

  test('returns an empty series for a day that was never ingested', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    const result = await querySgpsReadings(query)

    expect(result.points).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses SEISS products that are not SGPS', async () => {
    await expect(
      querySgpsReadings({ ...query, product: 'MPSH', parameter: 'electron:T1:E1' }),
    ).rejects.toThrow('only accept SGPS')
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
  })
})
