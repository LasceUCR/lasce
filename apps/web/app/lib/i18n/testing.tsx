import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement, ReactNode } from 'react'

import { defaultLocale, timeZone, type Locale } from './config'
import { getMessages } from './messages'

interface RenderWithIntlOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Language to render in. Defaults to Spanish, the source language. */
  locale?: Locale
}

/**
 * `render` for a component that calls `useTranslations`. It provides the real catalogue, not
 * a mock, so a test asserts the text a visitor reads.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = defaultLocale, ...options }: RenderWithIntlOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={getMessages(locale)} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
