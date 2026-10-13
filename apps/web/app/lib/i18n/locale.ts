import { defaultLocale, isLocale, type Locale } from './config'

/**
 * The locale a request is rendered in, from the value of the locale cookie.
 *
 * An absent or unrecognised value (a hand-edited cookie, a language that was later removed)
 * resolves to the default instead of throwing. The browser's `Accept-Language` is deliberately
 * not consulted: the site is Spanish until the visitor chooses otherwise.
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : defaultLocale
}
