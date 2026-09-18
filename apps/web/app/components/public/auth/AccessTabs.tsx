'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  ACCESS_TAB_ORDER,
  ACCESS_TAB_PARAM,
  ACCESS_TAB_VALUES,
  accessTabsCopy,
  type AccessTab,
} from '@/app/lib/auth/login'

export interface AccessTabsProps {
  /** Which card starts open; the page reads it from the query string. */
  initialTab: AccessTab
  login: ReactNode
  register: ReactNode
}

/**
 * The tab selector of the access page: "Iniciar sesión" and "Crear cuenta",
 * one card visible at a time. Both cards stay mounted so a half-typed form
 * survives a switch, and the query string follows the selection so a reload
 * or a shared link opens the same tab. Follows the WAI-ARIA tabs pattern:
 * roving focus, arrow keys, Home and End.
 */
export function AccessTabs({ initialTab, login, register }: AccessTabsProps) {
  const [selected, setSelected] = useState<AccessTab>(initialTab)
  const baseId = useId()
  const tabs = useRef<Partial<Record<AccessTab, HTMLButtonElement | null>>>({})
  const panels: Record<AccessTab, ReactNode> = { login, register }

  function select(tab: AccessTab, moveFocus = false) {
    setSelected(tab)
    if (moveFocus) tabs.current[tab]?.focus()

    const url = new URL(window.location.href)
    url.searchParams.set(ACCESS_TAB_PARAM, ACCESS_TAB_VALUES[tab])
    window.history.replaceState(window.history.state, '', url)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = ACCESS_TAB_ORDER.indexOf(selected)
    const last = ACCESS_TAB_ORDER.length - 1
    let target: AccessTab | undefined

    if (event.key === 'ArrowRight') target = ACCESS_TAB_ORDER[index === last ? 0 : index + 1]
    else if (event.key === 'ArrowLeft') target = ACCESS_TAB_ORDER[index === 0 ? last : index - 1]
    else if (event.key === 'Home') target = ACCESS_TAB_ORDER[0]
    else if (event.key === 'End') target = ACCESS_TAB_ORDER[last]

    if (!target) return
    event.preventDefault()
    select(target, true)
  }

  return (
    <div className="access-tabs-shell">
      <div
        aria-label={accessTabsCopy.label}
        className="access-tabs"
        onKeyDown={handleKeyDown}
        role="tablist"
      >
        {ACCESS_TAB_ORDER.map((tab) => (
          <button
            aria-controls={`${baseId}-${tab}-panel`}
            aria-selected={selected === tab}
            className="access-tab"
            id={`${baseId}-${tab}-tab`}
            key={tab}
            onClick={() => select(tab)}
            ref={(element) => {
              tabs.current[tab] = element
            }}
            role="tab"
            tabIndex={selected === tab ? 0 : -1}
            type="button"
          >
            {accessTabsCopy.tabs[tab]}
          </button>
        ))}
      </div>

      {ACCESS_TAB_ORDER.map((tab) => (
        <div
          aria-labelledby={`${baseId}-${tab}-tab`}
          className="access-tabpanel"
          hidden={selected !== tab}
          id={`${baseId}-${tab}-panel`}
          key={tab}
          role="tabpanel"
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  )
}
