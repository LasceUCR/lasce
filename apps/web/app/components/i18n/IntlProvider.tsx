'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { Messages } from 'next-intl'
import type { ReactNode } from 'react'

import { getMessageFallback, onIntlError, type Locale } from '@/app/lib/i18n'

interface Props {
  locale: Locale
  messages: Messages
  children: ReactNode
}

/**
 * `NextIntlClientProvider` inherits `locale`, `messages`, `now`, `timeZone`
 * and `formats` for free when it is rendered directly from a Server
 * Component — but `onError` and `getMessageFallback` are functions, and
 * functions are never passed across the server/client boundary. Without this
 * wrapper the client side would silently fall back to next-intl's own
 * defaults instead of the behaviour configured in `app/lib/i18n.ts`.
 */
export function IntlProvider({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={onIntlError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  )
}
