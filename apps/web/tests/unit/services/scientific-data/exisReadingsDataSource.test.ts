import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({ queryInfluxSql: vi.fn() }))

vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))

import {
  queryExisReadings,
  queryExisReadingsFull,
} from '@/app/services/scientific-data/exisReadingsDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-27',
  startTime: '08:00',
  endTime: '09:00',
}

function reading(
  time: string,
  value: number,
  n: number,
  satellite = 'G19',
  stats = { minimum: value, maximum: value },
) {
  return { time, value, satellite, n, ...stats }
}

/** One synthetic day at one reading a minute: a quiet floor with a short flare between rows. */
function dayWithFlare() {
  const total = 1_440
  const values = Array.from({ length: total }, (_, minute) =>
    minute >= 600 && minute <= 602 ? [2e-6, 3.35e-5, 2e-6][minute - 600]! : 1e-7 + minute * 1e-11,
  )
  return values.map((value, minute) =>
    reading(new Date(Date.UTC(2026, 8, 27, 0, minute)).toISOString(), value, total, 'G19', {
      minimum: Math.min(...values),
      maximum: Math.max(...values),
    }),
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('queryExisReadings', () => {
  test('binds the product, channel and whole-minute bounds as query params', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryExisReadings(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(params).toEqual({
      product: 'SFXR',
      channel: '0.1-0.8nm',
      start: '2026-09-27T08:00:00Z',
      end: '2026-09-27T09:00:59.999Z',
    })
    expect(sql).toContain('FROM exis_irradiance')
    expect(sql).not.toContain('0.1-0.8nm')
  })

  test('reads across midnight up to the next day when the end is before the start', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryExisReadings({ ...query, date: '2026-09-30', startTime: '23:00', endTime: '01:00' })

    expect(mocks.queryInfluxSql.mock.calls[0]![1]).toMatchObject({
      start: '2026-09-30T23:00:00Z',
      end: '2026-10-01T01:00:59.999Z',
    })
  })

  test('excludes withdrawn readings before numbering and sampling', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryExisReadings(query)

    const [sql] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).toContain('valid = true')
    expect(sql.indexOf('valid = true')).toBeLessThan(sql.indexOf(') WHERE n <= 360'))
  })

  test('keeps the lowest and highest reading of each stretch and summarizes every reading', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryExisReadings(query)

    const [sql] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).toContain('(rn - 1) * 179 / n')
    expect(sql).toContain('ORDER BY value ASC, time')
    expect(sql).toContain('ORDER BY value DESC, time')
    expect(sql).toContain('MIN(value) OVER (PARTITION BY satellite) AS minimum')
    expect(sql).toContain('MAX(value) OVER (PARTITION BY satellite) AS maximum')
    expect(sql).toContain('WHERE n <= 360 OR rn = 1 OR rn = n OR low = 1 OR high = 1')
  })

  test('draws a flare that falls between evenly spaced rows and reports its real peak', async () => {
    mocks.queryInfluxSql.mockResolvedValue(dayWithFlare())

    const result = await queryExisReadings(query)
    const evenStride = Math.ceil(1_439 / 359)

    // The former evenly spaced sample (every 5th row) skipped minute 601, where the peak is.
    expect(601 % evenStride).not.toBe(0)
    expect(result.points.length).toBeLessThanOrEqual(360)
    expect(result.points.map(({ value }) => value)).toContain(3.35e-5)
    expect(result.points[0]!.timestamp).toBe('2026-09-27T00:00:00.000Z')
    expect(result.points.at(-1)!.timestamp).toBe('2026-09-27T23:59:00.000Z')
    expect(result.summary).toEqual({
      minimum: 1e-7,
      maximum: 3.35e-5,
      latest: 1e-7 + 1_439 * 1e-11,
    })
    expect(result.origin.sampledPoints).toBe(result.points.length)
  })

  test('takes the summary from every reading even when the peak is not among the points', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-09-27T08:00:00', 1e-7, 2, 'G19', { minimum: 5e-8, maximum: 4e-5 }),
      reading('2026-09-27T08:30:00', 2e-7, 2, 'G19', { minimum: 5e-8, maximum: 4e-5 }),
    ])

    const result = await queryExisReadings(query)

    expect(result.summary).toEqual({ minimum: 5e-8, maximum: 4e-5, latest: 2e-7 })
  })

  test('returns the readings as an observed GOES series with explicit UTC timestamps', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-09-27T08:00:00.377369', 5.9e-7, 2),
      reading('2026-09-27T08:00:01.377369', 6.1e-7, 2),
    ])

    const result = await queryExisReadings(query)

    expect(result).toMatchObject({
      visualization: 'time-series',
      instrument: { code: 'EXIS' },
      product: { code: 'SFXR' },
      parameter: { code: '0.1-0.8nm' },
      origin: { kind: 'observed', satellite: 19 },
      points: [
        { timestamp: '2026-09-27T08:00:00.377369Z', value: 5.9e-7 },
        { timestamp: '2026-09-27T08:00:01.377369Z', value: 6.1e-7 },
      ],
    })
    expect(result.origin).not.toHaveProperty('sampledPoints')
  })

  test('keeps only the spacecraft that observed most recently', async () => {
    mocks.queryInfluxSql.mockResolvedValue([
      reading('2026-09-27T08:00:00', 1, 2, 'G18'),
      reading('2026-09-27T08:10:00', 2, 1, 'G19'),
      reading('2026-09-27T08:20:00', 3, 2, 'G18'),
    ])

    const result = await queryExisReadings(query)

    expect(result.origin.satellite).toBe(18)
    expect(result.points.map(({ value }) => value)).toEqual([1, 3])
  })

  test('announces sampling and never returns more than 360 points', async () => {
    const rows = Array.from({ length: 361 }, (_, index) =>
      reading(new Date(Date.UTC(2026, 8, 27, 8, 0, index)).toISOString(), index, 81_208),
    )
    mocks.queryInfluxSql.mockResolvedValue(rows)

    const result = await queryExisReadings(query)

    expect(result.points.length).toBeLessThanOrEqual(360)
    expect(result.points[0]!.value).toBe(0)
    expect(result.points.at(-1)!.value).toBe(360)
    expect(result.origin.sampledPoints).toBe(result.points.length)
  })

  test('returns an empty series without a satellite for a day that was never ingested', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    const result = await queryExisReadings(query)

    expect(result.points).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses GOES products that are not EXIS', async () => {
    await expect(
      queryExisReadings({ ...query, product: 'GEOF', parameter: 'total' }),
    ).rejects.toThrow('only accept SFEU and SFXR')
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
  })
})

describe('queryExisReadingsFull', () => {
  test('reads every reading in the window without sampling, with the same bound params', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    await queryExisReadingsFull(query)

    const [sql, params] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).toContain('FROM exis_irradiance')
    expect(sql).toContain('valid = true')
    expect(sql).not.toContain('ROW_NUMBER')
    expect(params).toEqual({
      product: 'SFXR',
      channel: '0.1-0.8nm',
      start: '2026-09-27T08:00:00Z',
      end: '2026-09-27T09:00:59.999Z',
    })
  })

  test('keeps more than 360 readings of the latest satellite and says nothing was sampled', async () => {
    const rows = [
      reading('2026-09-27T07:59:59', -1, 0, 'G18'),
      ...Array.from({ length: 400 }, (_, index) =>
        reading(new Date(Date.UTC(2026, 8, 27, 8, 0, index)).toISOString(), index, 0),
      ),
    ]
    mocks.queryInfluxSql.mockResolvedValue(rows)

    const result = await queryExisReadingsFull(query)

    expect(result.points).toHaveLength(400)
    expect(result.points.some((point) => point.value === -1)).toBe(false)
    expect(result.summary).toEqual({ minimum: 0, maximum: 399, latest: 399 })
    expect(result.origin).toMatchObject({ kind: 'observed', satellite: 19 })
    expect(result.origin.resolution).toBe('full')
  })

  test('returns an empty series for a day that was never ingested', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    const result = await queryExisReadingsFull(query)

    expect(result.points).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('refuses GOES products that are not EXIS', async () => {
    await expect(
      queryExisReadingsFull({ ...query, product: 'GEOF', parameter: 'total' }),
    ).rejects.toThrow('only accept SFEU and SFXR')
  })
})
