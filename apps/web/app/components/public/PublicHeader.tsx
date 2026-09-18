'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { canSeeAdminNavigation } from '@/app/lib/auth/account'
import { Brand } from './Brand'
import { AccountLinks } from './auth/AccountLinks'
import { useAccount } from './auth/useAccount'

const navigation = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Investigación', href: '/investigacion' },
  { label: 'Publicaciones', href: '/publicaciones' },
  { label: 'Herramientas científicas', href: '/herramientas-cientificas' },
  { label: 'Datos', href: '/datos' },
  { label: 'Galería', href: '/galeria' },
  { label: 'Noticias', href: '/noticias' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Administración', href: '/administracion' },
]

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

  const items = canSeeAdminNavigation(role)
    ? navigation
    : navigation.filter((item) => item.href !== '/administracion')

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`} ref={headerRef}>
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'active' : undefined}
              href={item.href}
              key={item.label}
            >
              {item.label}
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
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

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
