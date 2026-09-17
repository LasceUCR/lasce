import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { useLatestSuviObservation } from './useLatestSuviObservation'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useLatestSuviObservation', () => {
  test('resolves the most recent frame and its observation time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            url: '/images/animations/suvi/primary/195/or_suvi-l2-ci195_g19_s20260915T184000Z_e20260915T184400Z_v1-0-2.png',
          },
          {
            url: '/images/animations/suvi/primary/195/or_suvi-l2-ci195_g19_s20260915T184400Z_e20260915T184800Z_v1-0-2.png',
          },
        ],
      }),
    )

    const { result } = renderHook(() => useLatestSuviObservation())

    expect(result.current).toEqual({ status: 'loading' })

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        src: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/or_suvi-l2-ci195_g19_s20260915T184400Z_e20260915T184800Z_v1-0-2.png',
        observedAtIso: '2026-09-15T18:44:00Z',
        observedAtLabel: '2026-09-15 18:44 UTC',
      }),
    )
  })

  test('falls back to unavailable when the feed request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useLatestSuviObservation())

    await waitFor(() => expect(result.current).toEqual({ status: 'unavailable' }))
  })

  test('falls back to unavailable when the latest frame has no readable timestamp', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ url: '/images/animations/suvi/primary/195/latest.png' }],
      }),
    )

    const { result } = renderHook(() => useLatestSuviObservation())

    await waitFor(() => expect(result.current).toEqual({ status: 'unavailable' }))
  })
})
