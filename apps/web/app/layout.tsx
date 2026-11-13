import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import './globals.css'
import { EditModeProvider } from './components/public/cms/EditModeProvider'
import { ToastProvider } from './components/public/toast/ToastProvider'
import { siteUrl } from './lib/site'

const shareImage = {
  url: '/images/tools/SWAAT-sun.webp',
  width: 1536,
  height: 1024,
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('metadata')])
  const title = t('title')
  const description = t('description')
  const image = { ...shareImage, alt: t('openGraphImageAlt') }

  return {
    metadataBase: siteUrl,
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: siteUrl.toString(),
      siteName: 'LASCE',
      locale: locale === 'es' ? 'es_CR' : 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
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
      <body>
        <NextIntlClientProvider>
          <ToastProvider>
            <EditModeProvider>{children}</EditModeProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
