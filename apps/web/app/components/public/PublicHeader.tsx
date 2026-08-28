'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Brand } from './Brand'

const navigation = [
  { label: 'Inicio', href: '/#inicio' },
  { label: 'Nosotros', href: '/#nosotros' },
  { label: 'Investigación', href: '/#investigacion' },
  { label: 'Instrumentación', href: '/#instrumentacion' },
  { label: 'Datos', href: '/#datos' },
  { label: 'Noticias', href: '/#noticias' },
  { label: 'Contacto', href: '/#contacto' },
]

export function PublicHeader() {
  const pathname = usePathname()

  return (
    <header className="site-header">
      <Link className="brand-link" href="/" aria-label="Ir al inicio">
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((item, index) => (
          <Link
            className={pathname === '/' && index === 0 ? 'active' : undefined}
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Link className="login-link" href="/#inicio">
        Ingresar
      </Link>

      <details className="mobile-menu">
        <summary aria-label="Abrir navegación">
          <Menu aria-hidden="true" size={25} strokeWidth={1.8} />
        </summary>
        <nav aria-label="Navegación móvil">
          {navigation.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  )
}
