import type { Metadata } from 'next'

import { ResumenPage } from '@/app/components/administracion/ResumenPage'

export const metadata: Metadata = {
  title: 'Administración | LASCE',
  description: 'Resumen del estado del laboratorio y sus sistemas.',
}

export default function AdministracionPage() {
  return <ResumenPage />
}
