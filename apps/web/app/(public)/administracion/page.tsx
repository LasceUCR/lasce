import type { Metadata } from 'next'

import { ResumenPage } from '@/app/components/administracion/ResumenPage'
import { requireUser } from '@/app/lib/auth/session'

export const metadata: Metadata = {
  title: 'Administración | LASCE',
  description: 'Resumen del estado del laboratorio y sus sistemas.',
}

export const dynamic = 'force-dynamic'

// The layout turns visitors away; this sends anonymous visitors to login and back here.
export default async function AdministracionPage() {
  await requireUser('/administracion')

  return <ResumenPage />
}
