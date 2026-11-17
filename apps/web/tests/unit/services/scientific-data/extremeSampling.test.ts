import { describe, expect, test } from 'vitest'

import {
  bucketOf,
  extremeBuckets,
  keepExtremes,
} from '@/app/services/scientific-data/extremeSampling'

function series(values: number[]) {
  return values.map((value, index) => ({ index, value }))
}

describe('keepExtremes', () => {
  test('returns a series that already fits unchanged', () => {
    const readings = series([3, 1, 2])

    expect(keepExtremes(readings, 360)).toEqual(readings)
  })

  test('keeps a one-reading spike that an every-Nth sample would skip', () => {
    const values = Array.from({ length: 86_400 }, (_, second) => (second === 43_201 ? 9 : 1))

    const kept = keepExtremes(series(values), 360)

    expect(kept.length).toBeLessThanOrEqual(360)
    expect(kept).toContainEqual({ index: 43_201, value: 9 })
  })

  test('keeps the first, the last and a dip as well as peaks, in time order', () => {
    const values = Array.from({ length: 5_000 }, (_, index) =>
      index === 2_500 ? -4 : Math.sin(index / 50),
    )

    const kept = keepExtremes(series(values), 360)
    const indexes = kept.map(({ index }) => index)

    expect(indexes[0]).toBe(0)
    expect(indexes.at(-1)).toBe(4_999)
    expect(indexes).toContain(2_500)
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
    expect(new Set(indexes).size).toBe(indexes.length)
  })

  test('never exceeds the limit, whatever the length', () => {
    for (const length of [361, 362, 719, 1_440, 10_007]) {
      const values = Array.from({ length }, (_, index) => ((index * 7919) % 101) - 50)
      expect(keepExtremes(series(values), 360).length).toBeLessThanOrEqual(360)
    }
  })

  test('breaks ties toward the earlier reading, as the SQL does', () => {
    const values = Array.from({ length: 720 }, () => 5)

    const kept = keepExtremes(series(values), 360)
    const firstOfEachStretch = values
      .map((_, index) => index)
      .filter((index) => index === 0 || bucketOf(index + 1, 720, 179) !== bucketOf(index, 720, 179))

    expect(kept.map(({ index }) => index)).toEqual([...firstOfEachStretch, 719])
  })
})

describe('stretches', () => {
  test('cut a series into stretches of two readings each within the limit', () => {
    expect(extremeBuckets(360)).toBe(179)
    expect(extremeBuckets(3)).toBe(1)
  })

  test('number every reading from the first stretch to the last', () => {
    expect(bucketOf(1, 1_440, 179)).toBe(0)
    expect(bucketOf(1_440, 1_440, 179)).toBe(178)
  })
})
