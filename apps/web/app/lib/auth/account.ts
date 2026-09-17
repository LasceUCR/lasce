import type { UserRole } from '@lasce/db'

/**
 * The signed-in account as the browser sees it, plus the copy of the account
 * menu and the `/cuenta` page. Client-safe: no `node:*`, no database, no zod.
 *
 * `lasce_account` is a second, non-HttpOnly cookie. It carries the display
 * name and role as JSON so the header can greet the visitor and show the
 * Administración tab without turning every public page dynamic. The HttpOnly
 * `lasce_session` cookie is what actually authenticates. Both are set and
 * cleared together by `app/lib/auth/session.ts`.
 */
export const ACCOUNT_COOKIE = 'lasce_account'

export interface AccountCookie {
  name: string
  role: UserRole | null
}

function isAccountRole(value: unknown): value is UserRole {
  return value === 'VISITOR' || value === 'ASSISTANT' || value === 'ADMIN'
}

/** Serialises the account cookie. Next URL-encodes this string when it sets it. */
export function encodeAccountCookie(account: AccountCookie): string {
  return JSON.stringify({ name: account.name, role: account.role })
}

/**
 * Parses a decoded account-cookie payload. A pre-role cookie that only stored
 * the display name still greets; its role is unknown, so the admin tab stays
 * hidden until the next login.
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
      return {
        name,
        role: 'role' in parsed && isAccountRole(parsed.role) ? parsed.role : null,
      }
    }
  } catch {
    // Legacy cookies were the display name, not JSON.
  }
  return { name: trimmed, role: null }
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

/** Assistants and administrators see the Administración tab; visitors do not. */
export function canSeeAdminNavigation(role: UserRole | null | undefined): boolean {
  return role === 'ASSISTANT' || role === 'ADMIN'
}

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

export const accountMenuCopy = {
  signIn: 'Ingresar',
  account: 'Mi cuenta',
  greeting: (fullName: string) => `Hola, ${shortName(fullName)}`,
  signOut: 'Cerrar sesión',
  signingOut: 'Cerrando sesión...',
} as const

/** The confirmation asked before a session is ended. */
export const signOutDialogCopy = {
  title: '¿Cerrar sesión?',
  body: 'Tu sesión en este navegador terminará y tendrás que volver a ingresar.',
  confirm: 'Cerrar sesión',
  cancel: 'Cancelar',
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
  VISITOR: 'Visitante',
  ASSISTANT: 'Asistente',
  ADMIN: 'Persona administradora',
}

export const cuentaMeta = {
  title: 'Mi cuenta | LASCE',
  description:
    'Tu perfil en el portal del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const cuentaIntro = {
  title: 'Mi cuenta',
  lead: 'Tu perfil en el portal y el control de tu sesión.',
} as const

export const accountSummaryCopy = {
  fullName: 'Nombre',
  email: 'Correo electrónico',
  institution: 'Institución',
  country: 'País',
  role: 'Rol',
  memberSince: 'Miembro desde',
} as const

export const cuentaBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const
