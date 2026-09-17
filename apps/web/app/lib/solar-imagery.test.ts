import { describe, expect, test } from 'vitest'

import { getSuviObservationTimestamp, resolveSuviFrameUrl } from './solar-imagery'

describe('resolveSuviFrameUrl', () => {
  test('resolves a feed-relative path against the NOAA origin', () => {
    expect(resolveSuviFrameUrl('/images/animations/suvi/primary/195/latest.png')).toBe(
      'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
    )
  })

  test('leaves an already-absolute URL untouched', () => {
    const absolute = 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png'

    expect(resolveSuviFrameUrl(absolute)).toBe(absolute)
  })
})

describe('getSuviObservationTimestamp', () => {
  test('reads the observation start time embedded in a SUVI frame filename', () => {
    const url =
      'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/or_suvi-l2-ci195_g19_s20260915T184000Z_e20260915T184400Z_v1-0-2.png'

    expect(getSuviObservationTimestamp(url)).toEqual({
      iso: '2026-09-15T18:40:00Z',
      label: '2026-09-15 18:40 UTC',
    })
  })

  test('returns null when the filename carries no timestamp', () => {
    expect(
      getSuviObservationTimestamp(
        'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
      ),
    ).toBeNull()
  })
})
