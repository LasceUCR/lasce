import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import './globals.css'
import { siteUrl } from './lib/site'
import { AnnotateWidget } from './components/utils/AnnotateWidget'
import { EditModeProvider } from './components/public/cms/EditModeProvider'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')

  return {
    metadataBase: siteUrl,
    title: t('title'),
    description: t('description'),
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
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <AnnotateWidget />
      <body>
        <NextIntlClientProvider>
          <EditModeProvider>{children}</EditModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
