import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({ queryInfluxSql: vi.fn() }))

vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))

import {
  queryMagReadings,
  queryMagReadingsFull,
} from '@/app/services/scientific-data/magReadingsDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'GEOF',
  parameter: 'EPN-x',
  date: '2026-10-14',
  startTime: '00:00',
  endTime: '23:59',
}

function reading(time: string, value: number, n: number, satellite = 'G19') {
  return { time, value, satellite, n }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('queryMagReadings', () => {
  test('reads the stored geomagnetic field with bound params and only valid readings', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryMagReadings(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(params).toEqual({
      product: 'GEOF',
      channel: 'EPN-x',
      start: '2026-10-14T00:00:00Z',
      end: '2026-10-14T23:59:59.999Z',
    })
    expect(sql).toContain('FROM mag_field')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('EPN-x')
  })

  test('returns signed values in nT as an observed GOES-19 series', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-10-14T00:00:00', -37.7, 2),
      reading('2026-10-14T00:01:00', -37.8, 2),
    ])

    const result = await queryMagReadings(query)

    expect(result).toMatchObject({
      visualization: 'time-series',
      instrument: { code: 'MAG' },
      product: { code: 'GEOF' },
      parameter: { code: 'EPN-x', unit: 'nT' },
      origin: { kind: 'observed', satellite: 19 },
      points: [
        { timestamp: '2026-10-14T00:00:00Z', value: -37.7 },
        { timestamp: '2026-10-14T00:01:00Z', value: -37.8 },
      ],
    })
    expect(result.origin.provider).toContain('MAG')
    expect(result.origin.notice).toContain('calidad degradada')
    expect(result.origin.notice).not.toContain('negativos')
  })

  test('announces sampling for a full day of 1-minute readings', async () => {
    const rows = Array.from({ length: 361 }, (_, index) =>
      reading(new Date(Date.UTC(2026, 9, 14, 0, index * 4)).toISOString(), index, 1_440),
    )
    mocks.queryInfluxSql.mockResolvedValue(rows)

    const result = await queryMagReadings(query)

    expect(result.points).toHaveLength(360)
    expect(result.origin.notice).toContain('360 observaciones distribuidas uniformemente')
  })

  test('returns an empty series for a day that was never ingested', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    const result = await queryMagReadings(query)

    expect(result.points).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses GOES products that are not MAG', async () => {
    await expect(
      queryMagReadings({ ...query, product: 'SFXR', parameter: '0.1-0.8nm' }),
    ).rejects.toThrow('only accept GEOF')
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
  })
})

describe('queryMagReadingsFull', () => {
  test('reads every valid reading without sampling', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-10-14T00:00:00', 90.6, 0),
      reading('2026-10-14T00:01:00', 90.5, 0),
    ])

    const result = await queryMagReadingsFull({ ...query, parameter: 'total' })

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).toContain('FROM mag_field')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('ROW_NUMBER')
    expect(params).toMatchObject({ product: 'GEOF', channel: 'total' })
    expect(result.points).toHaveLength(2)
    expect(result.origin.notice).toContain('sin muestreo')
  })

  test('refuses GOES products that are not MAG', async () => {
    await expect(
      queryMagReadingsFull({ ...query, product: 'MPSH', parameter: 'electron:T1:E1' }),
    ).rejects.toThrow('only accept GEOF')
  })
})
