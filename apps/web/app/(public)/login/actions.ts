'use server'

import { redirect } from 'next/navigation'

import { loginMessages, readLoginInput, validateLogin, type LoginState } from '@/app/lib/auth/login'
import { UNKNOWN_USER_PASSWORD_HASH, verifyPassword } from '@/app/lib/auth/password'
import { createSession } from '@/app/lib/auth/session'
import { safeReturnPath } from '@/app/lib/auth/session-token'
import { findUserByEmail } from '@/app/lib/auth/users'

/**
 * Server Action behind the `/login` form, in the shape `useActionState`
 * expects. Validation, the password check and the session itself live in
 * `app/lib/auth`; this only turns their outcomes into form state or a
 * redirect. It never throws to the client and never echoes a password back.
 *
 * Gated by the Playwright spec `tests/e2e/login.spec.ts`, like every Server
 * Action in this app.
 */
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

    await createSession({ id: user.id, fullName: user.fullName })
  } catch (error) {
    // The message, not the input: nothing the visitor typed belongs in a log.
    console.error('[login] loginUser failed:', error instanceof Error ? error.message : error)
    return { status: 'error', values, fieldErrors: {}, formError: loginMessages.unexpected }
  }

  // Outside the try on purpose: redirect() works by throwing.
  redirect(returnTo)
}
