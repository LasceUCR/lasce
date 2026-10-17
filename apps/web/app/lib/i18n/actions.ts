'use server'

import { cookies } from 'next/headers'

import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './config'

/**
 * Remembers the visitor's language. Setting a cookie from a Server Action makes Next render the
 * current route again, so the page changes language without a navigation.
 */
export async function setLocale(locale: string): Promise<void> {
  // A Server Action is a public endpoint: the argument is whatever the caller sent.
  if (!isLocale(locale)) return

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    // Read at call time rather than module load so tests can stub the environment.
    secure: process.env.NODE_ENV === 'production',
    maxAge: LOCALE_COOKIE_MAX_AGE,
  })
}
