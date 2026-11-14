import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Suspense, type ReactNode } from 'react'

import './globals.css'
import { siteUrl } from './lib/site'
import { NavigationProgress } from './components/public/NavigationProgress'
import { EditModeProvider } from './components/public/cms/EditModeProvider'
import { ToastProvider } from './components/public/toast/ToastProvider'

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
      <body>
        <NextIntlClientProvider>
          {/* `useSearchParams` needs a Suspense boundary, or a static page would bail out of
              prerendering whole. The bar is empty until a click, so it has no fallback. */}
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <ToastProvider>
            <EditModeProvider>{children}</EditModeProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
