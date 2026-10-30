import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({ queryInfluxSql: vi.fn() }))

vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))

import {
  queryMpshReadings,
  queryMpshReadingsFull,
} from '@/app/services/scientific-data/mpshReadingsDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'MPSH',
  parameter: 'electron:T3:E8',
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

describe('queryMpshReadings', () => {
  test('reads the stored particle flux with bound params and only valid readings', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryMpshReadings(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(params).toEqual({
      product: 'MPSH',
      channel: 'electron:T3:E8',
      start: '2026-10-27T00:00:00Z',
      end: '2026-10-27T23:59:59.999Z',
    })
    expect(sql).toContain('FROM mpsh_flux')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('electron:T3:E8')
  })

  test('returns fluxes in their catalogue unit as an observed GOES-19 series', async () => {
    mocks.queryInfluxSql.mockResolvedValue([reading('2026-10-27T00:00:00', 21822.5, 1)])

    const result = await queryMpshReadings(query)

    expect(result).toMatchObject({
      instrument: { code: 'SEISS' },
      product: { code: 'MPSH' },
      parameter: { code: 'electron:T3:E8', unit: 'partículas/(cm²·s·sr·keV)' },
      origin: { kind: 'observed', satellite: 19 },
      points: [{ timestamp: '2026-10-27T00:00:00Z', value: 21822.5 }],
    })
    expect(result.origin.provider).toContain('MPS-HI')
    expect(result.origin.notice).toContain('sin muestras válidas')
  })

  test('reads every stored reading, unsampled, for the data export', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryMpshReadingsFull(query)

    const [sql] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).toContain('FROM mpsh_flux')
    expect(sql).not.toContain('ROW_NUMBER')
  })

  test('refuses SEISS products that are not MPSH', async () => {
    await expect(
      queryMpshReadings({ ...query, product: 'SGPS', parameter: 'plus:P1' }),
    ).rejects.toThrow('only accept MPSH')
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
  })
})
