import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import type { Messages } from 'next-intl'

import {
  getMessageFallback,
  LOCALE_COOKIE,
  onIntlError,
  resolveLocale,
  type Locale,
} from '../lib/i18n'

// An explicit map rather than `import(\`../../messages/${locale}.json\`)`: with
// `output: 'standalone'` the file tracer has to see both JSON files
// statically, and this app already carries one `outputFileTracingIncludes`
// workaround in `next.config.ts` for a dynamic require it could not follow.
const catalogues = {
  es: () => import('../../messages/es.json'),
  en: () => import('../../messages/en.json'),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>

export default getRequestConfig(async () => {
  // Reading `cookies()` here is what opts every route rendered through the
  // root layout into dynamic rendering. That is the deliberate cost of
  // resolving the locale from a cookie with no `/[locale]` URL segment to read
  // it from: `sitemap.ts` and `robots.ts` never translate, so they stay static.
  const store = await cookies()
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value)

  return {
    locale,
    messages: (await catalogues[locale]()).default,
    onError: onIntlError,
    getMessageFallback,
  }
})
