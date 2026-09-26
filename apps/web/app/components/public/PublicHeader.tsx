'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { canSeeAdminNavigation } from '@/app/lib/auth/account'
import { Brand } from './Brand'
import { NavGroup, isActivePath, type NavGroupItem } from './NavGroup'
import { AccountLinks } from './auth/AccountLinks'
import { useAccount } from './auth/useAccount'

interface NavGroupEntry {
  label: string
  items: NavGroupItem[]
}

type NavEntry = NavGroupItem | NavGroupEntry

// The desktop header shows a group as a disclosure; the mobile menu lists every link.
const navigation: NavEntry[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
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
  { label: 'Administración', href: '/administracion' },
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

  const entries = canSeeAdminNavigation(role)
    ? navigation
    : navigation.filter((entry) => isGroup(entry) || entry.href !== '/administracion')
  const mobileItems = entries.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]))

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`} ref={headerRef}>
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {entries.map((entry) => {
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
          {mobileItems.map((item) => {
            const isActive = isActivePath(pathname, item.href)

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                href={item.href}
                key={item.label}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            )
          })}
          <AccountLinks
            account={account}
            isSigningOut={isSigningOut}
            onNavigate={closeMobileMenu}
            onSignOut={signOut}
            pathname={pathname}
            variant="mobile"
          />
        </nav>
      </details>
    </header>
  )
}
