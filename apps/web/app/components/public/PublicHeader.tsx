'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

import { Brand } from './Brand'

const navigation = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Investigación', href: '/investigacion' },
  { label: 'Instrumentación', href: '/instrumentacion' },
  { label: 'Datos', href: '/datos' },
  { label: 'Noticias', href: '/noticias' },
  { label: 'Contacto', href: '/contacto' },
]

export function PublicHeader() {
  const pathname = usePathname()
  const mobileMenu = useRef<HTMLDetailsElement>(null)

  function closeMobileMenu() {
    mobileMenu.current?.removeAttribute('open')
  }

  return (
    <header className="site-header">
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((item) => {
          const isActive = pathname === item.href

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

      <details className="mobile-menu" ref={mobileMenu}>
        <summary aria-label="Abrir navegación">
          <Menu aria-hidden="true" size={25} strokeWidth={1.8} />
        </summary>
        <nav aria-label="Navegación móvil">
          {navigation.map((item) => {
            const isActive = pathname === item.href

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
        </nav>
      </details>
    </header>
  )
}
