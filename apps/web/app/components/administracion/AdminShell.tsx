'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, LayoutDashboard, ScrollText, Server, Shield, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { visibleAdminMenu, type AdminMenuKey } from '@/app/lib/admin-sections'
import type { Permission } from '@/app/lib/auth/permissions'

import { AdminSidebar } from './AdminSidebar'

// Icons stay here so the catalogue in `lib/admin-sections.ts` remains plain data.
const icons: Record<AdminMenuKey, ReactNode> = {
  resumen: <LayoutDashboard size={18} strokeWidth={1.8} />,
  descargas: <Download size={18} strokeWidth={1.8} />,
  usuarios: <Users size={18} strokeWidth={1.8} />,
  permisos: <Shield size={18} strokeWidth={1.8} />,
  auditoria: <ScrollText size={18} strokeWidth={1.8} />,
  infraestructura: <Server size={18} strokeWidth={1.8} />,
}

export interface AdminShellProps {
  children: ReactNode
  /**
   * Grants the account holds, looked up once per request by the section layout.
   * Only the menu entries they unlock are rendered. Hiding a link is not an
   * authorization check; every section page still calls `requirePermission`.
   */
  granted: readonly Permission[]
}

export function AdminShell({ children, granted }: AdminShellProps) {
  const t = useTranslations('administration.shell')
  const pathname = usePathname()
  const items = visibleAdminMenu(granted).map((item) => ({
    label: t(`items.${item.key}`),
    href: item.href,
    icon: icons[item.key],
  }))

  return (
    <div className="admin-shell">
      <AdminSidebar activePathname={pathname} items={items} />
      <div className="admin-content">
        <div className="admin-header">
          <p className="topic-kicker">{t('panel')}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
