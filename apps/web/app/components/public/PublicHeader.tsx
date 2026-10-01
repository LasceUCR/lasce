'use client'

import Link from 'next/link'
import { ChevronDown, Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Brand } from './Brand'
import { NavGroup, isActivePath, type NavGroupItem } from './NavGroup'
import { AccountLinks } from './auth/AccountLinks'
import { useAccount } from './auth/useAccount'

interface NavGroupEntry {
  label: string
  items: NavGroupItem[]
}

type NavEntry = NavGroupItem | NavGroupEntry

// The desktop header shows a group as a disclosure; the mobile menu keeps the same
// grouping, under a plain label the group's own items nest below.
const navigation: NavEntry[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Nosotros',
    items: [
      { label: 'Quiénes somos', href: '/nosotros' },
      { label: 'Colaboraciones e Iniciativas', href: '/colaboraciones-e-iniciativas' },
    ],
  },
  { label: 'Investigación', href: '/investigacion' },
  { label: 'Datos', href: '/datos' },
  { label: 'Noticias', href: '/noticias' },
  {
    label: 'Recursos',
    items: [
      { label: 'Publicaciones', href: '/publicaciones' },
      { label: 'Herramientas científicas', href: '/herramientas-cientificas' },
      { label: 'Galería', href: '/galeria' },
    ],
  },
  { label: 'Contacto', href: '/contacto' },
]

function isGroup(entry: NavEntry): entry is NavGroupEntry {
  return 'items' in entry
}

export interface PublicHeaderProps {
  /** The logout Server Action, passed down by the layout so the header stays presentational. */
  logoutAction: () => Promise<void>
}

export function PublicHeader({ logoutAction }: PublicHeaderProps) {
  const pathname = usePathname()
  const { account, role, isSigningOut, signOut } = useAccount(logoutAction)
  const headerRef = useRef<HTMLElement>(null)
  const mobileMenu = useRef<HTMLDetailsElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    function updateHeaderState() {
      setIsScrolled(window.scrollY > 24)
    }

    updateHeaderState()
    window.addEventListener('scroll', updateHeaderState, { passive: true })

    return () => window.removeEventListener('scroll', updateHeaderState)
  }, [])

  function closeMobileMenu() {
    mobileMenu.current?.removeAttribute('open')
    setIsMobileMenuOpen(false)
  }

  function updateMobileMenuState() {
    setIsMobileMenuOpen(Boolean(mobileMenu.current?.open))
  }

  // Which mobile "Recursos"-style groups are expanded, keyed by label. Starts
  // with whichever ones contain the current page, and updates on navigation
  // without collapsing one the visitor opened by hand. A group's own `open`
  // is fully controlled from here rather than left to the native default, so
  // a click deterministically expands or collapses it (see NavGroup.tsx for
  // why relying on the native toggle alone is fragile).
  const [openGroupLabels, setOpenGroupLabels] = useState<Set<string>>(
    () =>
      new Set(
        navigation
          .filter(
            (entry): entry is NavGroupEntry =>
              isGroup(entry) && entry.items.some((item) => isActivePath(pathname, item.href)),
          )
          .map((entry) => entry.label),
      ),
  )

  useEffect(() => {
    setOpenGroupLabels((current) => {
      let changed = false
      const next = new Set(current)

      for (const entry of navigation) {
        if (
          isGroup(entry) &&
          entry.items.some((item) => isActivePath(pathname, item.href)) &&
          !next.has(entry.label)
        ) {
          next.add(entry.label)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [pathname])

  function toggleGroup(label: string) {
    setOpenGroupLabels((current) => {
      const next = new Set(current)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    function closeMenuOnOutsidePointer(event: PointerEvent) {
      if (headerRef.current?.contains(event.target as Node)) {
        return
      }

      closeMobileMenu()
    }

    document.addEventListener('pointerdown', closeMenuOnOutsidePointer)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('pointerdown', closeMenuOnOutsidePointer)
    }
  }, [isMobileMenuOpen])

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`} ref={headerRef}>
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((entry) => {
          if (isGroup(entry)) {
            return (
              <NavGroup
                items={entry.items}
                key={entry.label}
                label={entry.label}
                pathname={pathname}
              />
            )
          }

          const isActive = isActivePath(pathname, entry.href)

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'active' : undefined}
              href={entry.href}
              key={entry.label}
            >
              {entry.label}
            </Link>
          )
        })}
      </nav>

      <div className="header-actions">
        <AccountLinks
          account={account}
          isSigningOut={isSigningOut}
          onSignOut={signOut}
          pathname={pathname}
          role={role}
          variant="header"
        />
      </div>

      {isMobileMenuOpen ? (
        <button
          aria-label="Cerrar navegación"
          className="mobile-menu-backdrop"
          onClick={closeMobileMenu}
          type="button"
        />
      ) : null}

      <details className="mobile-menu" onToggle={updateMobileMenuState} ref={mobileMenu}>
        <summary aria-label="Abrir navegación">
          <Menu aria-hidden="true" size={25} strokeWidth={1.8} />
        </summary>
        <nav aria-label="Navegación móvil">
          {navigation.map((entry) => {
            if (isGroup(entry)) {
              return (
                <details
                  className="mobile-nav-group"
                  key={entry.label}
                  open={openGroupLabels.has(entry.label)}
                >
                  <summary
                    className="mobile-nav-group-summary"
                    onClick={(event) => {
                      event.preventDefault()
                      toggleGroup(entry.label)
                    }}
                  >
                    {entry.label}
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} />
                  </summary>
                  <div className="mobile-nav-group-panel">
                    {entry.items.map((item) => {
                      const isActive = isActivePath(pathname, item.href)

                      return (
                        <Link
                          aria-current={isActive ? 'page' : undefined}
                          className={
                            isActive ? 'mobile-nav-group-item active' : 'mobile-nav-group-item'
                          }
                          href={item.href}
                          key={item.label}
                          onClick={closeMobileMenu}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </details>
              )
            }

            const isActive = isActivePath(pathname, entry.href)

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                href={entry.href}
                key={entry.label}
                onClick={closeMobileMenu}
              >
                {entry.label}
              </Link>
            )
          })}
          <div className="mobile-account-section">
            <AccountLinks
              account={account}
              isSigningOut={isSigningOut}
              onNavigate={closeMobileMenu}
              onSignOut={signOut}
              pathname={pathname}
              role={role}
              variant="mobile"
            />
          </div>
        </nav>
      </details>
    </header>
  )
}
