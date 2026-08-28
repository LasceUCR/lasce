import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'LASCE | Universidad de Costa Rica',
  description:
    'Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica: observación solar, radioastronomía, instrumentación y clima espacial.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
