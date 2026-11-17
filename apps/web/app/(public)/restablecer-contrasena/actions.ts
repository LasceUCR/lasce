'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ACCOUNT_COOKIE } from '@/app/lib/auth/account'
import { hashPassword } from '@/app/lib/auth/password'
import {
  RESET_DONE_HREF,
  getResetSchema,
  invalidTokenState,
  readResetInput,
  validateReset,
  type ResetState,
} from '@/app/lib/auth/password-reset'
import {
  isPasswordResetTokenUsable,
  resetPasswordWithToken,
} from '@/app/lib/auth/password-reset-store'
import { isResetToken } from '@/app/lib/auth/password-reset-token'
import { SESSION_COOKIE } from '@/app/lib/auth/session-token'

/**
 * Sets a new password from an emailed link (LASCE-CON-0012-448). The password is checked against
 * the shared rule first, so a typo costs nothing; then `resetPasswordWithToken` uses the token,
 * stores the hash and revokes every session in one transaction. Success never signs the visitor
 * in: it clears this browser's cookies and sends them to the access page, which shows a toast.
 *
 * Gated by the Playwright spec `tests/e2e/password-reset.spec.ts`.
 */
export async function resetPassword(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const t = await getTranslations('auth.passwordReset.reset.validation')
  const input = readResetInput(formData)
  if (!isResetToken(input.token)) return invalidTokenState

  const validation = validateReset(
    input,
    getResetSchema({
      passwordRequired: t('passwordRequired'),
      passwordTooShort: t('passwordTooShort'),
      passwordTooLong: t('passwordTooLong'),
      confirmationRequired: t('confirmationRequired'),
      confirmationMismatch: t('confirmationMismatch'),
    }),
  )
  if (!validation.ok) {
    return { status: 'error', fieldErrors: validation.fieldErrors, formError: null }
  }

  try {
    // One indexed lookup before the costly hash, so a made-up token costs the server nothing.
    // The transaction below checks the token again; this is only the cheap early exit.
    if (!(await isPasswordResetTokenUsable(input.token))) return invalidTokenState
    const passwordHash = await hashPassword(validation.password)
    const result = await resetPasswordWithToken(input.token, passwordHash)
    if (!result.ok) return invalidTokenState

    // The session rows are gone already; drop this browser's stale cookies too.
    const store = await cookies()
    store.delete(SESSION_COOKIE)
    store.delete(ACCOUNT_COOKIE)
  } catch (error) {
    // The message, never the input or the token.
    console.error(
      '[password-reset] resetPassword failed:',
      error instanceof Error ? error.message : error,
    )
    return { status: 'error', fieldErrors: {}, formError: t('unexpected') }
  }

  // Outside the try on purpose: redirect() works by throwing.
  redirect(RESET_DONE_HREF)
}
