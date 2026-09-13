'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Brand } from './Brand'

const navigation = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Investigación', href: '/investigacion' },
  { label: 'Instrumentación', href: '/instrumentacion' },
  { label: 'Datos', href: '/datos' },
  { label: 'Galería', href: '/galeria' },
  { label: 'Noticias', href: '/noticias' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Administración', href: '/administracion' },
]

export function PublicHeader() {
  const pathname = usePathname()
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

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`} ref={headerRef}>
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((item) => {
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
        <Link className="login-link" href="/login">
          Ingresar
        </Link>
        <Link
          aria-current={pathname === '/registro' ? 'page' : undefined}
          className="login-link register-link"
          href="/registro"
        >
          Crear cuenta
        </Link>
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
          {navigation.map((item) => {
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
          <Link
            aria-current={pathname === '/registro' ? 'page' : undefined}
            className={pathname === '/registro' ? 'active' : undefined}
            href="/registro"
            onClick={closeMobileMenu}
          >
            Crear cuenta
          </Link>
        </nav>
      </details>
    </header>
  )
}
