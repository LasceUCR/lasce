'use client'

import { ChevronDown, Menu } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { isAdminItemActive } from '@/app/lib/admin-sections'

export interface AdminSidebarItem {
  label: string
  href: string
  icon: ReactNode
}

export interface AdminSidebarProps {
  items: AdminSidebarItem[]
  activePathname: string
  /** Start with the narrow-screen list expanded. Stories and tests use it. */
  defaultOpen?: boolean
}

/**
 * The administration navigation. Above 1120px it is the fixed sidebar and the
 * toggle button is not displayed. Below that width the same list sits behind a
 * sticky bar whose button names the current section; the list opens in place
 * and closes on Escape (focus returns to the button), on a pointer outside the
 * navigation, when a link is chosen, or when the pathname changes. One DOM
 * serves both layouts, so every link exists exactly once and CSS alone decides
 * what is visible.
 */
export function AdminSidebar({ items, activePathname, defaultOpen = false }: AdminSidebarProps) {
  const listId = useId()
  const nav = useRef<HTMLElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  // The pathname the list was opened on. Navigating elsewhere closes it without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(defaultOpen ? activePathname : null)
  const isOpen = openedAt === activePathname
  const current = items.find((item) => isAdminItemActive(item.href, activePathname))

  function close() {
    setOpenedAt(null)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (nav.current?.contains(event.target as Node)) {
        return
      }

      setOpenedAt(null)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)

    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isOpen])

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape' || !isOpen) {
      return
    }

    event.preventDefault()
    close()
    button.current?.focus()
  }

  return (
    <nav
      aria-label="Panel de administración"
      className={isOpen ? 'admin-sidebar is-open' : 'admin-sidebar'}
      onKeyDown={handleKeyDown}
      ref={nav}
    >
      <button
        aria-controls={listId}
        aria-expanded={isOpen}
        className="admin-menu-toggle"
        onClick={() => setOpenedAt(isOpen ? null : activePathname)}
        ref={button}
        type="button"
      >
        <Menu aria-hidden="true" size={20} strokeWidth={1.8} />
        <span>Menú</span>
        {current ? <span className="admin-menu-current">{current.label}</span> : null}
        <ChevronDown
          aria-hidden="true"
          className="admin-menu-chevron"
          size={16}
          strokeWidth={1.6}
        />
      </button>
      <ul id={listId}>
        {items.map((item) => {
          const isActive = isAdminItemActive(item.href, activePathname)

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                href={item.href}
                onClick={close}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
