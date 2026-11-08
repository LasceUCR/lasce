'use client'

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'

import type { UserRole } from '@lasce/db'

import {
  clearStoredEditMode,
  useOptionalEditMode,
} from '@/app/components/public/cms/EditModeProvider'
import {
  clearAccountCookie,
  notifyAccountChanged,
  parseAccountCookieValue,
  readAccountCookieSnapshot,
  subscribeAccount,
  writeAccountCookie,
} from '@/app/lib/auth/account'
import { parseSessionCapabilities, type AccountCapabilities } from '@/app/lib/auth/capabilities'

/** Where the header asks the server who is signed in and what they may do. */
export const SESSION_ENDPOINT = '/api/session'

export interface AccountState {
  /** Display name, or `null` when signed out. Cosmetic: read from the account cookie for an instant greeting. */
  account: string | null
  /** Role confirmed by the server; `null` while signed out or until `GET /api/session` answers. */
  role: UserRole | null
  /** Offer the Administración link. Only ever `true` after the server confirmed it. */
  canAccessAdmin: boolean
  /** Offer the "Modo edición" switch. Only ever `true` after the server confirmed it. */
  canEdit: boolean
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

interface Confirmed {
  /** The account-cookie snapshot this answer belongs to; a new login invalidates it. */
  snapshot: string
  capabilities: AccountCapabilities
}

/**
 * Who is signed in and what the header may offer them, plus a sign-out
 * transition (LASCE-SEC-001).
 *
 * The display name comes from the `lasce_account` cookie, read with
 * `useSyncExternalStore`, so the greeting appears at once and the static public
 * pages render signed-out on the server without a hydration mismatch. That
 * cookie is editable by the browser, so it decides nothing else: the role, the
 * Administración link and the "Modo edición" switch wait for `GET /api/session`,
 * which reads the HttpOnly session and the current permission matrix. Until it
 * answers, and whenever it fails, nothing privileged is offered.
 *
 * The capabilities are fetched again when the account cookie changes, when
 * `refreshKey` changes (the header passes the pathname, so a role or matrix
 * change shows on the next navigation) and when the tab becomes visible. When
 * the server says the session is gone, the stale cookie is removed and edit
 * mode is turned off; edit mode is also turned off when the account can no
 * longer edit, and on sign-out.
 */
export function useAccount(logoutAction: () => Promise<void>, refreshKey?: string): AccountState {
  const snapshot = useSyncExternalStore(subscribeAccount, readClientSnapshot, readServerSnapshot)
  const parsed = snapshot ? parseAccountCookieValue(snapshot) : null
  const [isSigningOut, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null)
  const [visibleTick, setVisibleTick] = useState(0)
  const editModeContext = useOptionalEditMode()
  // The provider hands out a new setter on every render; a ref keeps toggling
  // edit mode from refetching the capabilities.
  const setEditModeRef = useRef(editModeContext?.setEditMode)
  useEffect(() => {
    setEditModeRef.current = editModeContext?.setEditMode
  })

  function turnEditModeOff() {
    const setEditMode = setEditModeRef.current
    if (setEditMode) setEditMode(false)
    else clearStoredEditMode()
  }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setVisibleTick((tick) => tick + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    // Anonymous visitors have nothing to confirm, and get no request per page.
    if (!snapshot) return

    const controller = new AbortController()
    fetch(SESSION_ENDPOINT, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => {
        // A server error is not a sign-out: keep the greeting, offer nothing privileged.
        if (!response.ok) throw new Error(`GET ${SESSION_ENDPOINT} ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((body: unknown) => {
        if (controller.signal.aborted) return
        const session = parseSessionCapabilities(body)
        if (!session.signedIn) {
          // The session expired or was revoked: drop the stale greeting and the edit mode.
          setConfirmed(null)
          turnEditModeOff()
          clearAccountCookie()
          notifyAccountChanged()
          return
        }
        const capabilities: AccountCapabilities = {
          name: session.name,
          role: session.role,
          canAccessAdmin: session.canAccessAdmin,
          canEdit: session.canEdit,
        }
        setConfirmed({ snapshot, capabilities })
        if (!capabilities.canEdit) turnEditModeOff()
      })
      .catch(() => {
        // Network or server error, or abort: offer nothing privileged and keep the greeting.
      })

    return () => controller.abort()
    // `turnEditModeOff` reads a ref; `refreshKey` and `visibleTick` only trigger a new request.
  }, [snapshot, refreshKey, visibleTick])

  function signOut() {
    const previous = snapshot ? parseAccountCookieValue(snapshot) : null

    startTransition(async () => {
      turnEditModeOff()
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

  // An answer for another login (or for nobody) never applies to the current cookie.
  const capabilities =
    parsed && confirmed && confirmed.snapshot === snapshot ? confirmed.capabilities : null

  return {
    account: parsed ? (capabilities?.name ?? parsed.name) : null,
    role: capabilities?.role ?? null,
    canAccessAdmin: capabilities?.canAccessAdmin ?? false,
    canEdit: capabilities?.canEdit ?? false,
    isSigningOut,
    signOut,
  }
}
