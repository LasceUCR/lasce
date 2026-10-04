// Free of `next/headers` and any other server-only import: Client Components, tests and
// Storybook all read the locale list from here.

/** Every language the site can render. Adding one is described in `docs/internationalization.md`. */
export const locales = ['es', 'en'] as const

export type Locale = (typeof locales)[number]

/** The source language: its catalogue defines the message keys and backs every fallback. */
export const defaultLocale = 'es' satisfies Locale

/** Each language's name in that language, as the language switcher shows it. */
export const localeLabels: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
}

export const LOCALE_COOKIE = 'lasce_locale'

/** One year. The choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Dates and times are shown in Costa Rica time whatever the language. */
export const timeZone = 'America/Costa_Rica'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}
