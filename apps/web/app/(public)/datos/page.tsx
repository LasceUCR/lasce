import type { Metadata } from 'next'

import { ToolsPage } from '@/app/components/public/tools/ToolsPage'

export const metadata: Metadata = {
  title: 'Herramientas científicas | LASCE',
  description: 'Acceso a servicios especializados integrados o enlazados desde LASCE.',
}

export default function DatosRoute() {
  return <ToolsPage />
}
