import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery, ScientificProductCode } from '@/app/lib/scientific-data'
import {
  queryNoaaScientificData,
  ScientificDataUpstreamError,
} from '@/app/services/scientific-data/noaaScientificDataSource'

function responseWith(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}

function query(
  product: ScientificProductCode,
  parameter: string,
  overrides: Partial<ScientificDataQuery> = {},
): ScientificDataQuery {
  return {
    source: 'GOES',
    product,
    parameter,
    date: '2026-09-10',
    startTime: '08:00',
    endTime: '09:00',
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('queryNoaaScientificData', () => {
  test('filters real X-ray observations by band and requested UTC interval', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      responseWith([
        { time_tag: '2026-09-10T07:59:00Z', satellite: 18, flux: 1, energy: '0.1-0.8nm' },
        { time_tag: '2026-09-10T08:15:00Z', satellite: 18, flux: 2, energy: '0.05-0.4nm' },
        { time_tag: '2026-09-10T08:30:00Z', satellite: 18, flux: 3, energy: '0.1-0.8nm' },
        { time_tag: '2026-09-10T08:31:00Z', satellite: 18, flux: null, energy: '0.1-0.8nm' },
        { time_tag: '2026-09-10T08:32:00Z', satellite: 18, flux: -999, energy: '0.1-0.8nm' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await queryNoaaScientificData(query('SFXR', '0.1-0.8nm'))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json',
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(result).toMatchObject({
      visualization: 'time-series',
      origin: { kind: 'observed', satellite: 18 },
    })
    if (result.visualization !== 'time-series') throw new Error('Expected a time series')
    expect(result.points).toEqual([{ timestamp: '2026-09-10T08:30:00Z', value: 3 }])
  })

  test.each([
    {
      name: 'EUV line',
      product: 'SFEU' as const,
      parameter: '304',
      path: 'euvs-7-day.json',
      reading: { time_tag: '2026-09-10T08:20:00Z', satellite: 19, line: '304', value: 4 },
    },
    {
      name: 'magnetometer component',
      product: 'GEOF' as const,
      parameter: 'Hp',
      path: 'magnetometers-7-day.json',
      reading: {
        time_tag: '2026-09-10T08:20:00Z',
        satellite: 19,
        Hp: 5,
        He: 6,
        Hn: 7,
        total: 8,
      },
    },
    {
      name: 'electron channel',
      product: 'MPSH' as const,
      parameter: 'electron:134 keV',
      path: 'differential-electrons-7-day.json',
      reading: { time_tag: '2026-09-10T08:20:00Z', satellite: 19, flux: 9, energy: '134 keV' },
    },
    {
      name: 'proton channel',
      product: 'SGPS' as const,
      parameter: 'proton:P1',
      path: 'differential-protons-7-day.json',
      reading: {
        time_tag: '2026-09-10T08:20:00Z',
        satellite: 18,
        flux: 10,
        energy: '1020-1860 keV',
        channel: 'P1',
      },
    },
    {
      name: 'integral proton threshold',
      product: 'SGPS' as const,
      parameter: '>=10 MeV',
      path: 'integral-protons-7-day.json',
      reading: {
        time_tag: '2026-09-10T08:20:00Z',
        satellite: 18,
        flux: 11,
        energy: '>=10 MeV',
      },
    },
  ])('maps the NOAA $name feed without generating values', async (fixture) => {
    const fetchMock = vi.fn().mockResolvedValue(responseWith([fixture.reading]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await queryNoaaScientificData(query(fixture.product, fixture.parameter))

    expect(fetchMock.mock.calls[0]![0]).toContain(fixture.path)
    expect(result.visualization).toBe('time-series')
    if (result.visualization !== 'time-series') throw new Error('Expected a time series')
    expect(result.points).toHaveLength(1)
    expect(result.points[0]!.value).toBeGreaterThanOrEqual(4)
    expect(result.origin.kind).toBe('observed')
  })

  test('samples large observed series without interpolating values', async () => {
    const readings = Array.from({ length: 365 }, (_, index) => ({
      time_tag: `2026-09-10T${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00Z`,
      satellite: 18,
      flux: index,
      energy: '0.1-0.8nm',
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseWith(readings)))

    const result = await queryNoaaScientificData(
      query('SFXR', '0.1-0.8nm', { startTime: '00:00', endTime: '07:00' }),
    )

    if (result.visualization !== 'time-series') throw new Error('Expected a time series')
    expect(result.points).toHaveLength(360)
    expect(result.points[0]!.value).toBe(0)
    expect(result.points.at(-1)!.value).toBe(364)
    expect(result.origin.notice).toMatch(/no se interpolaron valores/i)
  })

  test('returns observed SUVI images whose timestamps match the query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        responseWith([
          { url: '/images/animations/suvi/primary/171/not-a-science-file.png' },
          {
            url: '/images/animations/suvi/primary/171/or_suvi-l2-ci171_g19_s20260910T083000Z_e20260910T083400Z_v1-0-3.png',
          },
          {
            url: '/images/animations/suvi/primary/171/or_suvi-l2-ci171_g19_s20260910T103000Z_e20260910T103400Z_v1-0-3.png',
          },
        ]),
      ),
    )

    const result = await queryNoaaScientificData(query('Fe171', 'image'))

    expect(result.visualization).toBe('image-sequence')
    if (result.visualization !== 'image-sequence') throw new Error('Expected images')
    expect(result.images).toEqual([
      {
        timestamp: '2026-09-10T08:30:00Z',
        imageUrl:
          'https://services.swpc.noaa.gov/images/animations/suvi/primary/171/or_suvi-l2-ci171_g19_s20260910T083000Z_e20260910T083400Z_v1-0-3.png',
        alt: 'Imágenes solares: 171 Å (Fe171) observada por GOES-19 a las 08:30 UTC',
      },
    ])
    expect(result.origin).toMatchObject({ kind: 'observed', satellite: 19 })
  })

  test.each([
    ['an HTTP error', responseWith([], false, 503)],
    ['an invalid payload', responseWith({ unexpected: true })],
  ])('reports %s from NOAA as an upstream error', async (_label, response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(queryNoaaScientificData(query('SFXR', '0.1-0.8nm'))).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })

  test('reports a network failure as an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(queryNoaaScientificData(query('SFXR', '0.1-0.8nm'))).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })
})
