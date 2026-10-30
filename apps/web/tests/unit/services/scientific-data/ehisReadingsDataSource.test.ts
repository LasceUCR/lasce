import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({ queryInfluxSql: vi.fn() }))

vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))

import { queryEhisReadings } from '@/app/services/scientific-data/ehisReadingsDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'EHIS',
  parameter: 'H:E3',
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

describe('queryEhisReadings', () => {
  test('reads the stored heavy ion flux with bound params and only valid readings', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryEhisReadings(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(params).toEqual({
      product: 'EHIS',
      channel: 'H:E3',
      start: '2026-10-14T00:00:00Z',
      end: '2026-10-14T23:59:59.999Z',
    })
    expect(sql).toContain('FROM ehis_flux')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('H:E3')
  })

  test('returns fluxes in their catalogue unit as an observed GOES-19 series', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-10-14T00:04:02', 0.0033, 2),
      reading('2026-10-14T00:09:02', 0.0031, 2),
    ])

    const result = await queryEhisReadings(query)

    expect(result).toMatchObject({
      visualization: 'time-series',
      instrument: { code: 'SEISS' },
      product: { code: 'EHIS' },
      parameter: { code: 'H:E3', unit: 'partículas/(cm²·s·sr·MeV/nucleón)' },
      origin: { kind: 'observed', satellite: 19 },
      points: [
        { timestamp: '2026-10-14T00:04:02Z', value: 0.0033 },
        { timestamp: '2026-10-14T00:09:02Z', value: 0.0031 },
      ],
    })
    expect(result.origin.provider).toContain('EHIS')
    expect(result.origin.notice).toContain('inválidas')
    expect(result.origin.notice).toContain('degradadas')
  })

  test('does not announce sampling for a full day of 5-minute readings', async () => {
    const rows = Array.from({ length: 288 }, (_, index) =>
      reading(new Date(Date.UTC(2026, 9, 14, 0, index * 5)).toISOString(), index, 288),
    )
    mocks.queryInfluxSql.mockResolvedValue(rows)

    const result = await queryEhisReadings(query)

    expect(result.points).toHaveLength(288)
    expect(result.origin.notice).not.toContain('distribuidas uniformemente')
  })

  test('returns an empty series for a day that was never ingested', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    const result = await queryEhisReadings(query)

    expect(result.points).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses SEISS products that are not EHIS', async () => {
    await expect(
      queryEhisReadings({ ...query, product: 'MPSH', parameter: 'electron:T1:E1' }),
    ).rejects.toThrow('only accept EHIS')
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
  })
})
