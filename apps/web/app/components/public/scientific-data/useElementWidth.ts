'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The rendered width of an element, in CSS pixels, kept up to date as it resizes. `undefined`
 * until it has been measured (on the server and in environments without layout), so a chart
 * renders at its default width first and then lays itself out for its container.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number>()

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
