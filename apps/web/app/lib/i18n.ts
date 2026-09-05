import { IntlErrorCode, type IntlError } from 'next-intl'

// Kept free of `next/headers` and any other server-only import: `IntlProvider`
// (a Client Component) imports `onIntlError` and `getMessageFallback` from
// here, and pulling in a server module would break the client bundle.

export const locales = ['es', 'en'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'es'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

/**
 * The one place the cookie's fallback rule lives: an absent or unrecognized
 * cookie value (a stale `fr`, a value from before `en` existed) resolves to
 * `defaultLocale` rather than throwing.
 */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale
}

/**
 * In development a missing message is a bug worth stopping on. In production
 * it would take the whole page down for every visitor, so it's logged instead
 * and `getMessageFallback` below renders something in its place.
 */
export function onIntlError(error: IntlError): void {
  if (error.code === IntlErrorCode.MISSING_MESSAGE && process.env.NODE_ENV === 'development') {
    throw error
  }

  console.error(error)
}

/**
 * Renders the dotted key path instead of an empty node, so a missing message
 * is visible in production rather than a silent blank spot in the layout.
 */
export function getMessageFallback({
  namespace,
  key,
}: {
  namespace?: string
  key: string
}): string {
  return namespace ? `${namespace}.${key}` : key
}
