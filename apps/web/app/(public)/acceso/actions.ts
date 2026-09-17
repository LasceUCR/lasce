'use server'

import { redirect } from 'next/navigation'

import { loginMessages, readLoginInput, validateLogin, type LoginState } from '@/app/lib/auth/login'
import { UNKNOWN_USER_PASSWORD_HASH, hashPassword, verifyPassword } from '@/app/lib/auth/password'
import DuplicateEmailError from '@/app/lib/auth/errors/DuplicateEmailError'
import {
  initialRegistrationState,
  readRegistrationInput,
  registrationMessages,
  toEchoValues,
  validateRegistration,
  type RegistrationState,
} from '@/app/lib/auth/registration'
import { createSession } from '@/app/lib/auth/session'
import { safeReturnPath } from '@/app/lib/auth/session-token'
import { createUser, findUserByEmail } from '@/app/lib/auth/users'

/**
 * The two Server Actions behind the `/acceso` cards, in the shape
 * `useActionState` expects. Validation, hashing, the password check and the
 * session itself live in `app/lib/auth`; these only turn their outcomes into
 * form state or a redirect. Neither throws to the client or echoes a password.
 *
 * Gated by the Playwright specs `tests/e2e/registro.spec.ts` and
 * `tests/e2e/login.spec.ts`, like every Server Action in this app.
 */

/** Signs a registered user in; on success it redirects, so no state comes back. */
export async function loginUser(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const input = readLoginInput(formData)
  const values = { email: input.email }
  const validation = validateLogin(input)

  if (!validation.ok) {
    return {
      status: 'error',
      values,
      fieldErrors: validation.fieldErrors,
      formError: loginMessages.reviewFields,
    }
  }

  const { email, password } = validation.data
  // The hidden input is validated again here: it came from the browser.
  const returnTo = safeReturnPath(input.next)

  try {
    const user = await findUserByEmail(email)
    // Always pay the scrypt cost, so an unknown address takes as long as a
    // wrong password and the response time reveals nothing.
    const verified = await verifyPassword(
      password,
      user?.passwordHash ?? UNKNOWN_USER_PASSWORD_HASH,
    )
    if (!user || !verified) {
      return {
        status: 'error',
        values,
        fieldErrors: {},
        formError: loginMessages.invalidCredentials,
      }
    }

    await createSession({ id: user.id, fullName: user.fullName, role: user.role })
  } catch (error) {
    // The message, not the input: nothing the visitor typed belongs in a log.
    console.error('[acceso] loginUser failed:', error instanceof Error ? error.message : error)
    return { status: 'error', values, fieldErrors: {}, formError: loginMessages.unexpected }
  }

  // Outside the try on purpose: redirect() works by throwing.
  redirect(returnTo)
}

/** Creates an account (LASCE-SEC-008-071); the card then shows its confirmation. */
export async function registerUser(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const input = readRegistrationInput(formData)
  const values = toEchoValues(input)
  const validation = validateRegistration(input)

  if (!validation.ok) {
    return {
      status: 'error',
      values,
      fieldErrors: validation.fieldErrors,
      formError: registrationMessages.reviewFields,
    }
  }

  // Only the five validated fields reach the database. The role is the
  // database's decision, and nothing else from the request is forwarded.
  const { fullName, email, institution, countryCode, password } = validation.data

  try {
    const passwordHash = await hashPassword(password)
    await createUser({ fullName, email, institution, countryCode, passwordHash })
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return {
        status: 'error',
        values: { ...values, email },
        fieldErrors: { email: registrationMessages.emailTaken },
        formError: registrationMessages.reviewFields,
      }
    }

    console.error('[acceso] registerUser failed:', error instanceof Error ? error.message : error)
    return {
      status: 'error',
      values,
      fieldErrors: {},
      formError: registrationMessages.unexpected,
    }
  }

  return { ...initialRegistrationState, status: 'success' }
}
