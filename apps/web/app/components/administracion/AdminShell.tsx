'use client'

import { usePathname } from 'next/navigation'
import { Download, LayoutDashboard, Server, Shield, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { Toggle } from '@/app/components/public/Toggle'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { adminMenu, type AdminMenuKey } from '@/app/lib/admin-sections'

import { AdminSidebar, type AdminSidebarItem } from './AdminSidebar'

// Icons stay here so the catalogue in `lib/admin-sections.ts` remains plain data.
const icons: Record<AdminMenuKey, ReactNode> = {
  resumen: <LayoutDashboard size={18} strokeWidth={1.8} />,
  descargas: <Download size={18} strokeWidth={1.8} />,
  usuarios: <Users size={18} strokeWidth={1.8} />,
  permisos: <Shield size={18} strokeWidth={1.8} />,
  infraestructura: <Server size={18} strokeWidth={1.8} />,
}

const adminNavigation: AdminSidebarItem[] = adminMenu.map((item) => ({
  label: item.label,
  href: item.href,
  icon: icons[item.key],
}))

export interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const { editMode, setEditMode } = useEditMode()

  return (
    <div className="admin-shell">
      <AdminSidebar activePathname={pathname} items={adminNavigation} />
      <div className="admin-content">
        <div className="admin-header">
          <p className="topic-kicker">Panel de administración</p>
          <Toggle
            checked={editMode}
            id="edit-mode-toggle"
            label="Modo edición"
            onChange={setEditMode}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
