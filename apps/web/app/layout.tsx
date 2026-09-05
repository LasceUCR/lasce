import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { IntlProvider } from './components/i18n/IntlProvider'
import './globals.css'
import { siteUrl } from './lib/site'

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
  const messages = await getMessages()

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <IntlProvider locale={locale} messages={messages}>
          {children}
        </IntlProvider>
      </body>
    </html>
  )
}
