import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { siteUrl } from './lib/site'
import { AnnotateWidget } from './components/utils/AnnotateWidget'
import isProduction from './lib/helpers/isProduction'

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'LASCE | Universidad de Costa Rica',
  description:
    'Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica: observación solar, radioastronomía, instrumentación y clima espacial.',
  icons: {
    icon: {
      url: '/brand/ucr-favicon-square.png',
      type: 'image/png',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      {!isProduction() && <AnnotateWidget />}
      <body>{children}</body>
    </html>
  )
}
