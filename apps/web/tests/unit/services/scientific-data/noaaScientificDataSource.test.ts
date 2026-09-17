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

    await expect(queryNoaaScientificData(query('Fe171', 'image'))).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })

  test('reports a network failure as an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(queryNoaaScientificData(query('Fe171', 'image'))).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })
})
