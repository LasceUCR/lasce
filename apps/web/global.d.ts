import type { Locale } from '@/app/lib/i18n/config'
import type esMessages from './messages/es.json'

// Augmenting next-intl's `AppConfig` types `useLocale()` as `Locale` and checks every
// `t('...')` key against the Spanish catalogue, which is the source language: a key that
// is missing there fails `typecheck`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof esMessages
  }
}
