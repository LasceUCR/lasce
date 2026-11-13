'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import styles from './NavigationProgress.module.css'

export type NavigationProgressState = 'idle' | 'loading' | 'done'

export interface NavigationProgressProps {
  /**
   * How long the bar may stay up before it gives up, in milliseconds. A navigation that never
   * lands (a link whose click was cancelled, a request that hangs) must not leave it on screen.
   */
  timeoutMs?: number
  /** Start in a given state. Stories use it to show the bar without clicking a link. */
  initialState?: NavigationProgressState
}

// How long the completed bar stays up while it fills and fades out.
const FINISH_MS = 400

/**
 * Whether a click on `anchor` starts a client-side navigation to another page of this site: a
 * plain left click on a same-origin link that changes the path or the query. Everything the
 * browser handles on its own (a new tab, a download, a modified click, another site, an anchor
 * on the same page) is left alone, since the URL this bar waits for would never change.
 */
export function startsNavigation(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false
  }

  const target = anchor.getAttribute('target')
  if ((target && target !== '_self') || anchor.hasAttribute('download')) return false

  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return false
  }

  if (url.origin !== window.location.origin) return false

  return url.pathname !== window.location.pathname || url.search !== window.location.search
}

/**
 * A load bar in the cyan strip along the top of the header. When a visitor clicks a link to
 * another page, the strip turns dark blue and the cyan fills back over it from the left. It
 * finishes when the new URL is in place (#475). Most public pages render on the
 * server on every request, so without it a slow render left the old page on screen with nothing
 * to show the click had been taken.
 *
 * It listens to clicks on the whole document rather than wrapping `<Link>`, so every link counts:
 * the header, the home page buttons, cards, pagination. It finishes when `usePathname` or
 * `useSearchParams` change. A second click while it runs restarts it instead of stacking a bar.
 *
 * It is decorative: hidden from assistive technology, because the destination's `loading.tsx`
 * already announces the loading state through `LoadingRegion`.
 */
export function NavigationProgress({
  timeoutMs = 15_000,
  initialState = 'idle',
}: NavigationProgressProps) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const [state, setState] = useState<NavigationProgressState>(initialState)
  // Restarts the CSS animation when a second click arrives while the bar is already running.
  const [run, setRun] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const location = useRef(`${pathname}?${search}`)
  // Read by the URL effect, which must not depend on `state` and re-run on every change of it.
  const isLoading = useRef(state === 'loading')

  useEffect(() => {
    isLoading.current = state === 'loading'
  }, [state])

  function schedule(callback: () => void, delay: number) {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      callback()
    }, delay)
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || !startsNavigation(event, anchor)) return

      setState('loading')
      setRun((current) => current + 1)
      schedule(() => setState('idle'), timeoutMs)
    }

    // Capture phase: the click is seen even when a handler further down stops its propagation.
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [timeoutMs])

  useEffect(() => {
    const next = `${pathname}?${search}`
    if (next === location.current) return
    location.current = next

    if (!isLoading.current) return
    setState('done')
    schedule(() => setState('idle'), FINISH_MS)
  }, [pathname, search])

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <div aria-hidden="true" className={styles.track} data-state={state}>
      <div className={styles.bar} key={run} />
    </div>
  )
}
