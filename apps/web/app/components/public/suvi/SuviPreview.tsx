'use client'

import { useEffect, useState } from 'react'

export interface SuviPreviewProps {
  satellite: string
  channels: readonly string[]
  intervalMs?: number
}

const DEFAULT_INTERVAL_MS = 30000

/**
 * Polls `/api/suvi/preview/[satellite]/[channel]` on an interval so the PoC page at `/suvi`
 * shows a new frame as soon as the worker publishes one, without a full page reload. `tick`
 * doubles as the cache-busting query param and as the "last updated" timestamp.
 */
export function SuviPreview({
  satellite,
  channels,
  intervalMs = DEFAULT_INTERVAL_MS,
}: SuviPreviewProps) {
  // Starts at 0 so the server and the client render the same markup; the first real
  // timestamp is set on mount, which also triggers the first fetch with a fresh query param.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setTick(Date.now())
    const id = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return (
    <div>
      <p>Última actualización: {tick === 0 ? '…' : new Date(tick).toLocaleTimeString('es-CR')}</p>
      <div style={{ display: 'flex', gap: '40px' }}>
        {channels.map((channel) => (
          <p key={channel}>
            {channel}
            <br />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/suvi/preview/${satellite}/${channel}?t=${tick}`}
              alt={`SUVI ${channel}`}
              width={250}
            />
          </p>
        ))}
      </div>
    </div>
  )
}
