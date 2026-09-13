import { z } from 'zod'

import { PASSWORD_MAX_LENGTH, registroIntro } from './registration'

/**
 * The login rules, in one place: field names, validation, user-facing messages
 * and the state the form and its Server Action exchange. Mirrors
 * `registration.ts` and, like it, is imported by the client-side form, so it
 * must stay free of `node:*` and database imports.
 */

export const LOGIN_FIELDS = ['email', 'password'] as const

export type LoginFieldName = (typeof LOGIN_FIELDS)[number]

/** Hidden input carrying the validated return path through the form. */
export const NEXT_FIELD = 'next'

/** One raw string per field plus the return path, exactly as read from the request. */
export type LoginInput = Record<LoginFieldName, string> & { next: string }

export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>

export const loginMessages = {
  emailRequired: 'Ingresa tu correo electrónico.',
  emailInvalid: 'Ingresa un correo electrónico válido.',
  passwordRequired: 'Ingresa tu contraseña.',
  reviewFields: 'Revisa los campos marcados para continuar.',
  /** Deliberately the same for a wrong password and an unknown address. */
  invalidCredentials: 'Correo o contraseña incorrectos.',
  unexpected: 'No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.',
  /** Shown on /login when a protected page sent the visitor here. */
  authRequired: 'Debes iniciar sesión para continuar.',
} as const

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, { error: loginMessages.emailInvalid })
    .pipe(
      z.email({
        error: (issue) =>
          issue.input === '' ? loginMessages.emailRequired : loginMessages.emailInvalid,
      }),
    ),
  // Not trimmed: a leading or trailing space is a legitimate character. No
  // minimum either; a short password is simply wrong, and registration already
  // enforces the length rules.
  password: z
    .string()
    .min(1, { error: loginMessages.passwordRequired })
    .max(PASSWORD_MAX_LENGTH, { error: loginMessages.invalidCredentials }),
})

export type LoginData = z.infer<typeof loginSchema>

/** Reads the two fields and the return path as strings ("" when missing or not a string). */
export function readLoginInput(formData: FormData): LoginInput {
  const read = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
  }
  return { email: read('email'), password: read('password'), next: read(NEXT_FIELD) }
}

export type LoginValidation =
  { ok: true; data: LoginData } | { ok: false; fieldErrors: LoginFieldErrors }

export function validateLogin(input: LoginInput): LoginValidation {
  const result = loginSchema.safeParse({ email: input.email, password: input.password })
  if (result.success) {
    return { ok: true, data: result.data }
  }

  const flattened = z.flattenError(result.error).fieldErrors
  const fieldErrors: LoginFieldErrors = {}
  for (const field of LOGIN_FIELDS) {
    const message = flattened[field]?.[0]
    if (message) {
      fieldErrors[field] = message
    }
  }
  return { ok: false, fieldErrors }
}

/**
 * What the Server Action returns and the form renders. There is no success
 * status: a successful login redirects, so the state never comes back.
 */
export interface LoginState {
  status: 'idle' | 'error'
  values: { email: string }
  fieldErrors: LoginFieldErrors
  /** Summary for the alert region: validation summary, bad credentials or failure. */
  formError: string | null
}

export const initialLoginState: LoginState = {
  status: 'idle',
  values: { email: '' },
  fieldErrors: {},
  formError: null,
}

/** Signature of the Server Action, in the shape React's `useActionState` expects. */
export type LoginAction = (state: LoginState, formData: FormData) => Promise<LoginState>

export const LOGIN_LABELS: Record<LoginFieldName, string> = {
  email: 'Correo electrónico',
  password: 'Contraseña',
}

export const LOGIN_PLACEHOLDERS: Partial<Record<LoginFieldName, string>> = {
  email: 'correo@ejemplo.com',
}

export const loginFormCopy = {
  submit: 'Ingresar',
  submitting: 'Ingresando...',
  noAccountPrompt: '¿No tienes cuenta?',
  noAccountLink: 'Crear cuenta',
  footnote: 'La descarga queda asociada a tu cuenta para fines de trazabilidad y uso científico.',
} as const

/** The one page that signs visitors in and up: `/acceso`. */
export const ACCESS_PATH = '/acceso'
/** Element ids of the two cards, so specs and links can target one of them. */
export const LOGIN_CARD_ID = 'iniciar-sesion'
export const REGISTRATION_CARD_ID = 'crear-cuenta'

/** The page shows one card at a time; the query string says which. */
export type AccessTab = 'login' | 'register'
export const ACCESS_TAB_PARAM = 'tab'
export const ACCESS_TAB_VALUES: Record<AccessTab, string> = {
  login: LOGIN_CARD_ID,
  register: REGISTRATION_CARD_ID,
}
export const ACCESS_TAB_ORDER: readonly AccessTab[] = ['login', 'register']

/** Reads the `tab` query parameter; anything but the registration value means login. */
export function accessTabFromParam(value: unknown): AccessTab {
  return value === ACCESS_TAB_VALUES.register ? 'register' : 'login'
}

export function accessTabHref(tab: AccessTab): string {
  return `${ACCESS_PATH}?${ACCESS_TAB_PARAM}=${ACCESS_TAB_VALUES[tab]}`
}

/** Where "Crear cuenta" links point: the access page with the registration tab open. */
export const REGISTRATION_HREF = accessTabHref('register')

export const accesoMeta = {
  title: 'Acceso al portal | LASCE',
  description:
    'Inicia sesión o crea una cuenta en el portal del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const accesoIntro = {
  title: 'Acceso al portal',
  lead: 'Inicia sesión o crea una cuenta para descargar productos científicos y revisar tu actividad.',
} as const

/** Heading of the login card. */
export const loginCardHeading = {
  title: 'Iniciar sesión',
  description: 'Accede para descargar productos científicos y revisar tu actividad.',
} as const

/** Heading of the registration card, beside the login card. */
export const registrationCardHeading = {
  title: registroIntro.title,
  description: registroIntro.lead,
} as const

export const accessTabsCopy = {
  label: 'Acceso',
  tabs: { login: 'Iniciar sesión', register: 'Crear cuenta' } as Record<AccessTab, string>,
} as const

export const accesoBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const
