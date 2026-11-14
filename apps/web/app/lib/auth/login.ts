import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { PASSWORD_MAX_LENGTH, registroIntro } from './registration'

/**
 * The login rules, in one place: field names, validation, user-facing messages
 * and the state the form and its Server Action exchange. Mirrors
 * `registration.ts` and, like it, is imported by the client-side form, so it
 * must stay free of `node:*` and database imports.
 *
 * The copy itself lives in the `auth.login` namespace of the message catalogues
 * (see `docs/internationalization.md`); this module re-exports the Spanish text
 * as the default for request-less call sites (tests, stories, the fallback
 * schema below). A request builds its own schema from the visitor's language
 * with `getLoginSchema`, the same factory pattern as
 * `getScientificDataQuerySchema` in `lib/scientific-data.ts`.
 */

export const LOGIN_FIELDS = ['email', 'password'] as const

export type LoginFieldName = (typeof LOGIN_FIELDS)[number]

/** Hidden input carrying the validated return path through the form. */
export const NEXT_FIELD = 'next'

/** One raw string per field plus the return path, exactly as read from the request. */
export type LoginInput = Record<LoginFieldName, string> & { next: string }

export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>

/** Deliberately the same message for a wrong password and an unknown address. */
export const loginMessages = es.auth.login.validation

/** The parts of a message catalogue `getLoginSchema` reads. */
export type LoginValidationMessages = Pick<
  typeof es.auth.login.validation,
  'emailRequired' | 'emailInvalid' | 'passwordRequired' | 'invalidCredentials'
>

/**
 * Builds the login schema with its validation messages in `messages`' language. The Server
 * Action builds one from the request's translations; `loginSchema` below is the Spanish
 * default other, request-less call sites use.
 */
export function getLoginSchema(messages: LoginValidationMessages) {
  return z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: messages.emailInvalid })
      .pipe(
        z.email({
          error: (issue) => (issue.input === '' ? messages.emailRequired : messages.emailInvalid),
        }),
      ),
    // Not trimmed: a leading or trailing space is a legitimate character. No
    // minimum either; a short password is simply wrong, and registration already
    // enforces the length rules.
    password: z
      .string()
      .min(1, { error: messages.passwordRequired })
      .max(PASSWORD_MAX_LENGTH, { error: messages.invalidCredentials }),
  })
}

export const loginSchema = getLoginSchema(loginMessages)

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

/**
 * Validates login input against `schema`, the Spanish default unless the caller built one
 * from the visitor's own language with `getLoginSchema`.
 */
export function validateLogin(
  input: LoginInput,
  schema: ReturnType<typeof getLoginSchema> = loginSchema,
): LoginValidation {
  const result = schema.safeParse({ email: input.email, password: input.password })
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

export const LOGIN_LABELS: Record<LoginFieldName, string> = es.auth.login.labels

export const LOGIN_PLACEHOLDERS: Partial<Record<LoginFieldName, string>> =
  es.auth.login.placeholders

export const loginFormCopy = {
  submit: es.auth.login.submit,
  submitting: es.auth.login.submitting,
  noAccountPrompt: es.auth.login.noAccountPrompt,
  noAccountLink: es.auth.login.noAccountLink,
  footnote: es.auth.login.footnote,
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

/** Link to one tab of the access page, keeping the return path when there is one. */
export function accessTabHref(tab: AccessTab, next?: string): string {
  const params = new URLSearchParams({ [ACCESS_TAB_PARAM]: ACCESS_TAB_VALUES[tab] })
  if (next) params.set(NEXT_FIELD, next)
  return `${ACCESS_PATH}?${params}`
}

/** Where "Crear cuenta" links point: the access page with the registration tab open. */
export const REGISTRATION_HREF = accessTabHref('register')
/** Where the registration confirmation points: the access page with the login tab open. */
export const LOGIN_HREF = accessTabHref('login')

export const accesoMeta = {
  title: es.auth.meta.title,
  description: es.auth.meta.description,
} as const

export const accesoIntro = {
  title: es.auth.page.title,
  lead: es.auth.page.lead,
} as const

/** Heading of the login card. */
export const loginCardHeading = {
  title: es.auth.login.heading.title,
  description: es.auth.login.heading.description,
} as const

/** Heading of the registration card, beside the login card. */
export const registrationCardHeading = {
  title: registroIntro.title,
  description: registroIntro.lead,
} as const

export const accessTabsCopy = {
  label: es.auth.tabs.label,
  tabs: { login: es.auth.tabs.login, register: es.auth.tabs.register } as Record<AccessTab, string>,
} as const

export const accesoBackLink = {
  href: '/',
  label: es.auth.page.backLink,
} as const
