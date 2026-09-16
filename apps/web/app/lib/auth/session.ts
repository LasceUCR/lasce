import { cache } from 'react'

import { prisma } from '@lasce/db'
import type { UserRole } from '@lasce/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ACCOUNT_COOKIE } from './account'
import {
  SESSION_COOKIE,
  accountCookieOptions,
  generateSessionToken,
  hashSessionToken,
  isSessionToken,
  loginRedirectPath,
  sessionCookieOptions,
  sessionExpiry,
} from './session-token'

/**
 * Database-backed sessions (LASCE-SEC-008-072). The browser holds a random
 * token in the HttpOnly `lasce_session` cookie; `auth.sessions` holds only its
 * hash. Deleting the row revokes the session immediately, which is what lets
 * logout satisfy "a terminated session must not keep granting access".
 *
 * Only `createSession` and `deleteCurrentSession` write cookies, and Next only
 * allows that inside Server Actions and Route Handlers. `getSessionUser` and
 * `requireUser` are read-only so pages and layouts can call them during render.
 */

/** The signed-in account, as pages need it. Never includes the password hash. */
export interface SessionUser {
  id: string
  fullName: string
  email: string
  institution: string
  countryCode: string
  role: UserRole | null
  createdAt: Date
}

const sessionUserSelect = {
  id: true,
  fullName: true,
  email: true,
  institution: true,
  countryCode: true,
  role: true,
  createdAt: true,
} as const

/** Opens a session for a user whose password was just verified. Server Actions only. */
export async function createSession(user: { id: string; fullName: string }): Promise<void> {
  const token = generateSessionToken()
  const expiresAt = sessionExpiry()

  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
  // Raw name: Next URL-encodes cookie values itself, and the client decodes once.
  store.set(ACCOUNT_COOKIE, user.fullName, accountCookieOptions(expiresAt))
}

async function readSessionToken(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value
  return isSessionToken(value) ? value : null
}

/**
 * The user behind the request's session cookie, or `null` when there is no
 * cookie, it is malformed, no row matches it or the row has expired. Memoised
 * per request so a layout and its page share one query. Never writes cookies.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken()
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { expiresAt: true, user: { select: sessionUserSelect } },
  })
  if (!session || session.expiresAt.getTime() <= Date.now()) return null

  return session.user
})

/**
 * Revokes the request's session and clears both cookies. Server Actions only.
 * The cookies are cleared even when no row is found, so a stale pair cannot
 * linger after the row was removed some other way.
 */
export async function deleteCurrentSession(): Promise<void> {
  const store = await cookies()
  const value = store.get(SESSION_COOKIE)?.value

  if (isSessionToken(value)) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(value) } })
  }

  store.delete(SESSION_COOKIE)
  store.delete(ACCOUNT_COOKIE)
}

/**
 * The signed-in user, or a redirect to the login page that remembers where the
 * visitor was going and why. Call it first thing in a protected page.
 */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    redirect(loginRedirectPath(returnTo))
  }
  return user
}
