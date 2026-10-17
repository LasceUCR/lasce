import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { LOCALE_COOKIE, timeZone } from './config'
import { resolveLocale } from './locale'
import { getMessages } from './messages'

// Registered in `next.config.ts`. next-intl calls this once per request, for Server Components,
// Server Actions and route handlers alike.
export default getRequestConfig(async () => {
  // Reading `cookies()` opts every page into dynamic rendering. That is the accepted cost of
  // choosing the language from a cookie instead of a `/[locale]` URL segment.
  const store = await cookies()
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value)

  return { locale, messages: getMessages(locale), timeZone }
})
