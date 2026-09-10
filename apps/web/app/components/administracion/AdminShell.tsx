'use client'

import { usePathname } from 'next/navigation'
import { Download, LayoutDashboard, Server, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { AdminSidebar, type AdminSidebarItem } from './AdminSidebar'

const adminNavigation: AdminSidebarItem[] = [
  {
    label: 'Resumen',
    href: '/administracion',
    icon: <LayoutDashboard size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Descargas',
    href: '/administracion/descargas',
    icon: <Download size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Usuarios',
    href: '/administracion/usuarios',
    icon: <Users size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Infraestructura',
    href: '/administracion/infraestructura',
    icon: <Server size={18} strokeWidth={1.8} />,
  },
]

export interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="admin-shell">
      <AdminSidebar activePathname={pathname} items={adminNavigation} />
      <div className="admin-content">
        <p className="topic-kicker">Panel de administración</p>
        {children}
      </div>
    </div>
  )
}
