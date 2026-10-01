'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import {
  scientificDataResultSchema,
  type ScientificImage,
  type ScientificInstrument,
  type ScientificProductCode,
} from '@/app/lib/scientific-data'
import { SolarToday } from './SolarToday'

export interface SolarTodayLiveProps {
  instrument: ScientificInstrument
  initialNow: string
}

interface SolarResponse {
  key: string
  state: 'success' | 'error'
  images: ScientificImage[]
}

const subscribe = () => () => undefined
const clientSnapshot = () => true
const serverSnapshot = () => false

export function SolarTodayLive({ instrument, initialNow }: SolarTodayLiveProps) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const [product, setProduct] = useState<ScientificProductCode>('Fe195')
  const [range, setRange] = useState('day')
  const [now, setNow] = useState(initialNow)
  const [refresh, setRefresh] = useState(0)
  const [response, setResponse] = useState<SolarResponse | null>(null)
  const key = `${product}-${range}-${now}-${refresh}`
  const current = response?.key === key ? response : null

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const end = new Date(now)
      const date = now.slice(0, 10)
      const midnight = new Date(`${date}T00:00:00Z`)
      const start =
        range === 'day'
          ? midnight
          : new Date(Math.max(midnight.getTime(), end.getTime() - Number(range) * 3_600_000))
      const startTime = start.toISOString().slice(11, 16)
      const endTime = end.toISOString().slice(11, 16)
      // Do not substitute yesterday before today's first complete selectable minute.
      if (startTime === endTime) {
        setResponse({ key, state: 'success', images: [] })
        return
      }
      try {
        const parameters = new URLSearchParams({
          source: 'GOES',
          product,
          parameter: 'image',
          date,
          startTime,
          endTime,
        })
        const result = await fetch(`/api/scientific-data?${parameters}`, {
          signal: controller.signal,
        })
        if (!result.ok || result.status === 202) throw new Error('Solar images unavailable')
        const parsed = scientificDataResultSchema.parse(await result.json())
        if (parsed.visualization !== 'image-sequence') throw new Error('Expected solar images')
        controller.signal.throwIfAborted()
        // A compact chronological row, including both ends of the requested interval.
        const images =
          parsed.images.length <= 5
            ? parsed.images
            : Array.from(
                { length: 5 },
                (_, index) => parsed.images[Math.round((index * (parsed.images.length - 1)) / 4)]!,
              )
        setResponse({ key, state: 'success', images })
      } catch {
        if (!controller.signal.aborted) setResponse({ key, state: 'error', images: [] })
      }
    }
    const timer = setTimeout(() => {
      void load()
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, now, product, range])

  return (
    <SolarToday
      instrument={instrument}
      product={product}
      range={range}
      date={now.slice(0, 10)}
      state={current?.state ?? 'loading'}
      images={current?.images ?? []}
      disabled={!hydrated}
      onProductChange={(value) => {
        setProduct(value)
        setNow(new Date().toISOString())
      }}
      onRangeChange={(value) => {
        setRange(value)
        setNow(new Date().toISOString())
      }}
      onRefresh={() => {
        setNow(new Date().toISOString())
        setRefresh((value) => value + 1)
      }}
    />
  )
}
