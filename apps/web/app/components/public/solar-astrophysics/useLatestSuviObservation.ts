'use client'

import { useEffect, useState } from 'react'

import {
  SUVI_195_ANIMATION_FEED_URL,
  getSuviObservationTimestamp,
  resolveSuviFrameUrl,
} from '@/app/lib/solar-imagery'

interface SuviFeedFrame {
  url?: string
}

export type LatestSuviObservation =
  | { status: 'loading' }
  | { status: 'ready'; src: string; observedAtIso: string; observedAtLabel: string }
  | { status: 'unavailable' }

/**
 * Fetches NOAA's rolling SUVI 195 Å feed and resolves it to the most recent
 * frame and its observation time. Client-side only: the feed changes every
 * few minutes and gains nothing from being rendered on the server.
 */
export function useLatestSuviObservation(): LatestSuviObservation {
  const [observation, setObservation] = useState<LatestSuviObservation>({ status: 'loading' })

  useEffect(() => {
    let isMounted = true

    async function loadLatestFrame() {
      try {
        const response = await fetch(SUVI_195_ANIMATION_FEED_URL, { cache: 'no-store' })

        if (!response.ok) {
          throw new Error('No se pudo obtener el feed de imágenes SUVI.')
        }

        const frames = (await response.json()) as SuviFeedFrame[]
        const lastFrame = [...frames].reverse().find((frame) => frame.url)

        if (!lastFrame?.url) {
          throw new Error('El feed de imágenes SUVI no trajo resultados.')
        }

        const src = resolveSuviFrameUrl(lastFrame.url)
        const timestamp = getSuviObservationTimestamp(src)

        if (!timestamp) {
          throw new Error('El frame más reciente no trae fecha de observación.')
        }

        if (isMounted) {
          setObservation({
            status: 'ready',
            src,
            observedAtIso: timestamp.iso,
            observedAtLabel: timestamp.label,
          })
        }
      } catch {
        if (isMounted) {
          setObservation({ status: 'unavailable' })
        }
      }
    }

    loadLatestFrame()

    return () => {
      isMounted = false
    }
  }, [])

  return observation
}
