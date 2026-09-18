'use client'

import { useSyncExternalStore, useTransition } from 'react'

import type { UserRole } from '@lasce/db'

import {
  clearAccountCookie,
  notifyAccountChanged,
  parseAccountCookieValue,
  readAccountCookieSnapshot,
  subscribeAccount,
  writeAccountCookie,
} from '@/app/lib/auth/account'

export interface AccountState {
  /** Display name from the account cookie, or `null` when signed out. */
  account: string | null
  /** Role from the account cookie; `null` when signed out or the cookie is legacy. */
  role: UserRole | null
  isSigningOut: boolean
  signOut: () => void
}

function readClientSnapshot(): string | null {
  return readAccountCookieSnapshot(document.cookie)
}

function readServerSnapshot(): null {
  return null
}

/**
 * Next implements `redirect()` by throwing, and when a Server Action called
 * from a client component redirects, that error reaches the caller. It means
 * the action succeeded and the router is already navigating.
 */
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  )
}

/**
 * Who is signed in, as far as the browser knows, plus a sign-out transition.
 *
 * The source of truth is the `lasce_account` cookie the login action sets next
 * to the session cookie. `useSyncExternalStore` reads it on every render (the
 * header re-renders on each navigation, so a login redirect is picked up) and
 * renders signed-out on the server and during hydration, so the static public
 * pages never mismatch.
 *
 * Signing out flips the menu optimistically, then runs the action, which
 * revokes the session and redirects home. If the action fails the cookie is
 * put back so the menu tells the truth again.
 */
export function useAccount(logoutAction: () => Promise<void>): AccountState {
  const snapshot = useSyncExternalStore(subscribeAccount, readClientSnapshot, readServerSnapshot)
  const parsed = snapshot ? parseAccountCookieValue(snapshot) : null
  const [isSigningOut, startTransition] = useTransition()

  function signOut() {
    const previous = snapshot ? parseAccountCookieValue(snapshot) : null

    startTransition(async () => {
      clearAccountCookie()
      notifyAccountChanged()
      try {
        await logoutAction()
      } catch (error) {
        if (!isNextRedirect(error) && previous) writeAccountCookie(previous)
      } finally {
        notifyAccountChanged()
      }
    })
  }

  return {
    account: parsed?.name ?? null,
    role: parsed?.role ?? null,
    isSigningOut,
    signOut,
  }
}
