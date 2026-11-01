'use client'

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

export interface Disclosure {
  detailsRef: React.RefObject<HTMLDetailsElement | null>
  summaryRef: React.RefObject<HTMLElement | null>
  open: () => void
  close: () => void
  handleSummaryClick: (event: MouseEvent<HTMLElement>) => void
  handleMouseLeave: () => void
  handleKeyDown: (event: KeyboardEvent<HTMLDetailsElement>) => void
  handleBlur: (event: FocusEvent<HTMLDetailsElement>) => void
}

/**
 * The open/close mechanics shared by every `<details>`-based dropdown in the
 * header: the "Recursos" and "Nosotros" nav groups (`NavGroup.tsx`) and the
 * signed-in account menu (`AccountMenu.tsx`). Hovering opens it without a
 * click; a click, Enter or Space also opens it (never toggles closed, so a
 * click right after a hover-open cannot flip it shut again); choosing an
 * item, Escape, the pointer leaving the group, a pointer outside or focus
 * leaving the group closes it. The `open` attribute on the `<details>`
 * element is the only state, so nothing lags behind the browser.
 *
 * The pointer leaving is given a short grace period (`handleMouseLeave`),
 * not an immediate close: the panel sits a few pixels below the trigger and
 * isn't always the same width as it (the account menu's panel is wider and
 * right-anchored), so a path from the trigger into the panel that isn't a
 * perfectly straight vertical line briefly crosses neither box. Cutting the
 * dropdown the instant that happens is what made it feel like it only
 * tolerated moving straight down; the grace period is cancelled the moment
 * the pointer re-enters (see `open`), so it never delays a real hover-out.
 *
 * A consumer wires the returned refs and handlers onto its own `<details>`/
 * `<summary>` markup (see `NavGroup.tsx` for the reference wiring); this hook
 * only owns the interaction, never the content of the panel.
 */
const HOVER_CLOSE_DELAY_MS = 120

interface OpenDisclosure {
  close: () => void
}

// Only one header dropdown is shown at a time. The hover grace period above
// keeps a dropdown open for a moment after the pointer leaves it, so moving
// quickly from one group to the next ("Investigación" -> "Divulgación") used
// to leave both panels open and overlapping. Whichever disclosure opens
// registers itself here and closes the previous one immediately, skipping
// its grace period.
let activeDisclosure: OpenDisclosure | null = null

export function useDisclosure(): Disclosure {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // A stable identity for this disclosure in `activeDisclosure`. `close` only
  // touches refs, so the one captured on the first render stays correct.
  const [self] = useState<OpenDisclosure>(() => ({ close: () => close() }))

  function cancelScheduledClose() {
    if (closeTimeoutRef.current === null) return
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }

  function releaseActive() {
    if (activeDisclosure === self) {
      activeDisclosure = null
    }
  }

  function open() {
    cancelScheduledClose()
    if (activeDisclosure && activeDisclosure !== self) {
      activeDisclosure.close()
    }
    activeDisclosure = self
    detailsRef.current?.setAttribute('open', '')
  }

  function close() {
    cancelScheduledClose()
    releaseActive()
    detailsRef.current?.removeAttribute('open')
  }

  // The pointer leaving schedules a close instead of running it immediately,
  // so briefly passing outside the trigger/panel on the way between them
  // (an unavoidable diagonal, or the account panel's own extra width)
  // doesn't cut the dropdown; re-entering before it fires cancels it (`open`
  // clears the same timeout).
  function handleMouseLeave() {
    cancelScheduledClose()
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null
      releaseActive()
      detailsRef.current?.removeAttribute('open')
    }, HOVER_CLOSE_DELAY_MS)
  }

  useEffect(
    () => () => {
      cancelScheduledClose()
      releaseActive()
    },
    [],
  )

  // The native default just toggles; prevent it and always open instead, so a
  // click while the pointer already opened it via hover cannot close it again.
  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    open()
  }

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const element = detailsRef.current
      if (!element?.open || element.contains(event.target as Node)) {
        return
      }

      releaseActive()
      element.removeAttribute('open')
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)

    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== 'Escape' || !detailsRef.current?.open) {
      return
    }

    event.preventDefault()
    close()
    summaryRef.current?.focus()
  }

  // Focus leaving the group closes it. A null relatedTarget is left alone: Safari
  // does not focus a link on click, and closing then would remove it mid-click.
  function handleBlur(event: FocusEvent<HTMLDetailsElement>) {
    const next = event.relatedTarget
    if (!next || detailsRef.current?.contains(next as Node)) {
      return
    }

    close()
  }

  return {
    detailsRef,
    summaryRef,
    open,
    close,
    handleSummaryClick,
    handleMouseLeave,
    handleKeyDown,
    handleBlur,
  }
}
