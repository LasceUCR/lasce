import type { locales } from '@/app/lib/i18n'
import type esMessages from './messages/es.json'

// Augmenting `next-intl`'s `AppConfig` is what makes an unknown locale
// unassignable to `Locale` and every `t('...')` call checked against the
// actual message keys. `es` is the reference catalogue for key shape (see
// `messages/es.json`), so `en` is typed as needing to match it.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof locales)[number]
    Messages: typeof esMessages
  }
}
