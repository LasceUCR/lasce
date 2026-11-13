import type { UserRole } from '@lasce/db'

/**
 * The signed-in account as the browser sees it, plus the copy of the account
 * menu and the `/cuenta` page. Client-safe: no `node:*`, no database, no zod.
 *
 * `lasce_account` is a second, non-HttpOnly cookie. It carries only the
 * display name, as JSON, so the header can greet the visitor at once without
 * turning every public page dynamic. The browser can read and edit it, so it
 * must never decide anything privileged (LASCE-SEC-001): the role, the
 * Administración link and the "Modo edición" switch come from `GET
 * /api/session`, which reads the HttpOnly `lasce_session` cookie. Both cookies
 * are set and cleared together by `app/lib/auth/session.ts`.
 */
export const ACCOUNT_COOKIE = 'lasce_account'

export interface AccountCookie {
  name: string
}

/** Serialises the account cookie. Next URL-encodes this string when it sets it. */
export function encodeAccountCookie(account: AccountCookie): string {
  return JSON.stringify({ name: account.name })
}

/**
 * Parses a decoded account-cookie payload into the display name. A `role` left
 * by an older login, or added by hand, is ignored: nothing reads it any more.
 */
export function parseAccountCookieValue(decoded: string): AccountCookie | null {
  const trimmed = decoded.trim()
  if (!trimmed) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      typeof parsed.name === 'string'
    ) {
      const name = parsed.name.trim()
      if (!name) return null
      return { name }
    }
  } catch {
    // Legacy cookies were the display name, not JSON.
  }
  return { name: trimmed }
}

function decodedAccountCookieValue(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== ACCOUNT_COOKIE) continue

    const rawValue = part.slice(separator + 1).trim()
    if (!rawValue) return null
    try {
      return decodeURIComponent(rawValue)
    } catch {
      return null
    }
  }
  return null
}

/** Snapshot value for `useSyncExternalStore`: a string, so identity stays stable. */
export function readAccountCookieSnapshot(cookieHeader: string): string | null {
  return decodedAccountCookieValue(cookieHeader)
}

export function readAccountCookie(cookieHeader: string): AccountCookie | null {
  const decoded = decodedAccountCookieValue(cookieHeader)
  return decoded ? parseAccountCookieValue(decoded) : null
}

/** Reads the display name from a `document.cookie` string, or `null` when signed out. */
export function readAccountName(cookieHeader: string): string | null {
  return readAccountCookie(cookieHeader)?.name ?? null
}

/**
 * Assistants and administrators may enter the administration panel; visitors
 * may not. Server-side only in practice: the `administracion` layout and
 * `GET /api/session` (which drives the header link) share this rule, always
 * with the role from the session, so the link is never shown to someone the
 * panel would turn away.
 */
export function canSeeAdminNavigation(role: UserRole | null | undefined): boolean {
  return role === 'ASSISTANT' || role === 'ADMIN'
}

/** Shown by the `administracion` layout to a signed-in account the rule above rejects. */
export const adminAccessDeniedMessage =
  'La administración está disponible solo para asistentes y personas administradoras.'

/** The first name, for the header greeting. */
export function shortName(fullName: string): string {
  const trimmed = fullName.trim()
  return trimmed.split(/\s+/)[0] || trimmed
}

/**
 * Removes the display-name cookie on the client. Used right before the logout
 * action runs so the menu flips at once, even when the redirect lands on the
 * page the visitor is already on.
 */
export function clearAccountCookie(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
}

/**
 * Re-creates the account cookie on the client, for the rare case where the
 * logout action fails after the menu already flipped. Session-scoped: the next
 * server response replaces it either way.
 */
export function writeAccountCookie(account: AccountCookie): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(encodeAccountCookie(account))}; Path=/; SameSite=Lax${secure}`
}

const listeners = new Set<() => void>()

/** Subscription half of the `useSyncExternalStore` pair behind `useAccount`. */
export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Tells every subscribed header to re-read the cookie. */
export function notifyAccountChanged(): void {
  for (const listener of listeners) listener()
}

/**
 * The account menu, its mobile equivalent, the sign-out confirmation and the `/cuenta` page
 * read their copy from the `account` catalogue namespace (`useTranslations('account')` and
 * `getTranslations('account')`) so they follow the site's language. `ROLE_LABELS` below stays
 * Spanish-only: it backs the audit summaries stored in Spanish and serves as a Spanish fixture.
 * `/administracion/usuarios` names the roles from `access.roles` instead (`roleName`).
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  VISITOR: 'Visitante',
  ASSISTANT: 'Asistente',
  ADMIN: 'Persona administradora',
}
