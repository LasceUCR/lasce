'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'

export interface NavGroupItem {
  label: string
  href: string
}

export interface NavGroupProps {
  /** The summary text. The group is not a page itself. */
  label: string
  items: NavGroupItem[]
  /** Current pathname, to mark the active item and the group. */
  pathname: string
  /** Start open. Stories use it to show the panel. */
  defaultOpen?: boolean
}

/** Whether `href` is the current page or an ancestor of it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * A disclosure of navigation links for the desktop header, on the native
 * `<details>` element like the mobile menu. Hovering the group opens it
 * without a click (so does a click, Enter or Space, for touch and keyboard);
 * choosing a link, Escape, the pointer leaving the group, a pointer outside
 * or focus leaving the group closes it. The links are in the tab order only
 * while it is open. The `open` attribute is the only state, so nothing lags
 * behind the browser. A click never toggles it closed (only the actions above
 * do): the native default is prevented and replaced with an explicit `open()`,
 * so a click right after a hover-open cannot flip it shut again.
 */
export function NavGroup({ label, items, pathname, defaultOpen = false }: NavGroupProps) {
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const isActive = items.some((item) => isActivePath(pathname, item.href))

  function open() {
    details.current?.setAttribute('open', '')
  }

  function close() {
    details.current?.removeAttribute('open')
  }

  // The native default just toggles; prevent it and always open instead, so a
  // click while the pointer already opened it via hover cannot close it again.
  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    open()
  }

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const element = details.current
      if (!element?.open || element.contains(event.target as Node)) {
        return
      }

      element.removeAttribute('open')
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)

    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== 'Escape' || !details.current?.open) {
      return
    }

    event.preventDefault()
    close()
    summary.current?.focus()
  }

  // Focus leaving the group closes it. A null relatedTarget is left alone: Safari
  // does not focus a link on click, and closing then would remove it mid-click.
  function handleBlur(event: FocusEvent<HTMLDetailsElement>) {
    const next = event.relatedTarget
    if (!next || details.current?.contains(next as Node)) {
      return
    }

    close()
  }

  return (
    <details
      className={isActive ? 'nav-group active' : 'nav-group'}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={open}
      onMouseLeave={close}
      open={defaultOpen ? true : undefined}
      ref={details}
    >
      <summary onClick={handleSummaryClick} ref={summary}>
        {label}
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.6} />
      </summary>
      <div className="nav-group-panel">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={active ? 'active' : undefined}
              href={item.href}
              key={item.href}
              onClick={close}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </details>
  )
}
