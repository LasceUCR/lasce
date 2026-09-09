import Link from 'next/link'
import type { ReactNode } from 'react'

export interface AdminSidebarItem {
  label: string
  href: string
  icon: ReactNode
}

export interface AdminSidebarProps {
  items: AdminSidebarItem[]
  activePathname: string
}

export function AdminSidebar({ items, activePathname }: AdminSidebarProps) {
  return (
    <nav aria-label="Panel de administración" className="admin-sidebar">
      <ul>
        {items.map((item) => {
          const isActive = activePathname === item.href

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                href={item.href}
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
