'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

import { useDisclosure } from './useDisclosure'

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
 * while it is open. The interaction itself lives in `useDisclosure`, shared
 * with the signed-in account menu (`AccountMenu.tsx`), so both dropdowns
 * open, close and feel identical; this component only owns what goes in the
 * panel.
 */
export function NavGroup({ label, items, pathname, defaultOpen = false }: NavGroupProps) {
  const {
    detailsRef,
    summaryRef,
    open,
    close,
    handleSummaryClick,
    handleMouseLeave,
    handleKeyDown,
    handleBlur,
  } = useDisclosure()
  const isActive = items.some((item) => isActivePath(pathname, item.href))

  return (
    <details
      className={isActive ? 'nav-group active' : 'nav-group'}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={open}
      onMouseLeave={handleMouseLeave}
      open={defaultOpen ? true : undefined}
      ref={detailsRef}
    >
      <summary onClick={handleSummaryClick} ref={summaryRef}>
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
