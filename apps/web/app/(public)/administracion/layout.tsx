import type { ReactNode } from 'react'

import { AdminShell } from '@/app/components/administracion/AdminShell'

export default function AdministracionLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
