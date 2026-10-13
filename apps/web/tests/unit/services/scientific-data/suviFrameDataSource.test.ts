import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('@lasce/db', () => ({ prisma: { suviFrame: { findMany: mocks.findMany } } }))

import { querySuviFrames } from '@/app/services/scientific-data/suviFrameDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'Fe171',
  parameter: 'image',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

function frame(id: string, observedAt: string, satellite = 'G19') {
  return { id, observedAt: new Date(observedAt), satellite }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('querySuviFrames', () => {
  test('reads clean, rendered frames of the channel inside the requested interval', async () => {
    mocks.findMany.mockResolvedValue([])

    await querySuviFrames(query)

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          channel: 'Fe171',
          observedAt: {
            gte: new Date('2026-09-10T08:00:00.000Z'),
            lte: new Date('2026-09-10T09:00:59.999Z'),
          },
          previewFile: { not: null },
          qualityFlag: 0,
        },
        orderBy: { observedAt: 'asc' },
      }),
    )
  })

  test('returns each frame as a same-origin image with its observation time', async () => {
    mocks.findMany.mockResolvedValue([frame('a', '2026-09-10T08:30:00.000Z')])

    const result = await querySuviFrames(query)

    expect(result).toMatchObject({
      visualization: 'image-sequence',
      instrument: { code: 'SUVI' },
      product: { code: 'Fe171' },
      parameter: { code: 'image' },
      origin: { kind: 'observed', satellite: 19 },
      images: [
        {
          timestamp: '2026-09-10T08:30:00Z',
          imageUrl: '/api/suvi/frames/a',
          alt: 'Imágenes solares: 171 Å (Fe171) observada por GOES-19 a las 08:30 UTC',
        },
      ],
    })
  })

  test('samples at most eight frames evenly, keeping the first and the last', async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) =>
        frame(`f${index}`, `2026-09-10T08:${String(index * 3).padStart(2, '0')}:00.000Z`),
      ),
    )

    const { images } = await querySuviFrames(query)

    expect(images).toHaveLength(8)
    expect(images[0]!.imageUrl).toBe('/api/suvi/frames/f0')
    expect(images.at(-1)!.imageUrl).toBe('/api/suvi/frames/f19')
  })

  test('keeps only the spacecraft that observed most recently', async () => {
    mocks.findMany.mockResolvedValue([
      frame('old', '2026-09-10T08:10:00.000Z', 'G18'),
      frame('new', '2026-09-10T08:20:00.000Z', 'G19'),
      frame('other', '2026-09-10T08:30:00.000Z', 'G18'),
    ])

    const result = await querySuviFrames(query)

    expect(result.origin.satellite).toBe(18)
    expect(result.images.map(({ imageUrl }) => imageUrl)).toEqual([
      '/api/suvi/frames/old',
      '/api/suvi/frames/other',
    ])
  })

  test('returns an empty sequence without a satellite when no frame matches', async () => {
    mocks.findMany.mockResolvedValue([])

    const result = await querySuviFrames(query)

    expect(result.images).toEqual([])
    expect(result.origin).not.toHaveProperty('satellite')
  })

  test('describes an unrecognised spacecraft name only as GOES', async () => {
    mocks.findMany.mockResolvedValue([frame('a', '2026-09-10T08:30:00.000Z', 'unknown')])

    const result = await querySuviFrames(query)

    expect(result.origin).not.toHaveProperty('satellite')
    expect(result.images[0]!.alt).toContain('observada por GOES a las 08:30 UTC')
  })

  test('reports a database failure as an upstream error', async () => {
    mocks.findMany.mockRejectedValue(new Error('connection refused'))

    await expect(querySuviFrames(query)).rejects.toBeInstanceOf(ScientificDataUpstreamError)
  })

  test('refuses products that are not SUVI images', async () => {
    await expect(
      querySuviFrames({ ...query, product: 'SFXR', parameter: '0.1-0.8nm' }),
    ).rejects.toThrow('only accepts SUVI images')
    expect(mocks.findMany).not.toHaveBeenCalled()
  })
})
