import type { UserRole } from '@lasce/db'

/**
 * The signed-in account as the browser sees it, plus the copy of the account
 * menu and the `/cuenta` page. Client-safe: no `node:*`, no database, no zod.
 *
 * `lasce_account` is a second, non-HttpOnly cookie that only carries the
 * display name. It exists so the header can show who is signed in without
 * turning every public page dynamic; the HttpOnly `lasce_session` cookie is
 * what actually authenticates. Both are set and cleared together by
 * `app/lib/auth/session.ts`.
 */
export const ACCOUNT_COOKIE = 'lasce_account'

/** Reads the display name from a `document.cookie` string, or `null` when signed out. */
export function readAccountName(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== ACCOUNT_COOKIE) continue

    const rawValue = part.slice(separator + 1).trim()
    if (!rawValue) return null
    try {
      const name = decodeURIComponent(rawValue).trim()
      return name || null
    } catch {
      return null
    }
  }
  return null
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
  register: 'Crear cuenta',
  account: 'Mi cuenta',
  greeting: (fullName: string) => `Hola, ${shortName(fullName)}`,
  signOut: 'Cerrar sesión',
  signingOut: 'Cerrando sesión...',
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
