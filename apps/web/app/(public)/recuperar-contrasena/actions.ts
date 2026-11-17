'use server'

import { getRedisConnection } from '@lasce/jobs'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'

import {
  getRecoverySchema,
  initialRecoveryState,
  validateRecovery,
  type RecoveryState,
} from '@/app/lib/auth/password-reset'
import { clientIp, processPasswordResetRequest } from '@/app/lib/auth/password-reset-request'
import { siteUrl } from '@/app/lib/site'

/**
 * Asks for a reset link (LASCE-CON-0012-448). A malformed address gets its field error; every
 * valid address, registered or not, gets the same confirmation straight away. The rate limits,
 * the token and the email run in `after()`, once the answer has been sent, so the response and
 * its timing reveal nothing about the account, the limits or the mail server. Failures there are
 * logged on the server only.
 *
 * Gated by the Playwright spec `tests/e2e/password-reset.spec.ts`.
 */
export async function requestPasswordReset(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const [t, tEmail, requestHeaders] = await Promise.all([
    getTranslations('auth.passwordReset.request.validation'),
    // Resolved now, in the visitor's language, because `after()` runs once the request is done.
    getTranslations('auth.passwordReset.email'),
    headers(),
  ])
  const raw = formData.get('email')
  const input = typeof raw === 'string' ? raw : ''
  const validation = validateRecovery(
    input,
    getRecoverySchema({ emailRequired: t('emailRequired'), emailInvalid: t('emailInvalid') }),
  )
  if (!validation.ok) {
    return { status: 'error', values: { email: input }, fieldErrors: validation.fieldErrors }
  }

  const { email } = validation
  const ip = clientIp(requestHeaders)
  after(async () => {
    try {
      await processPasswordResetRequest({
        email,
        ip,
        origin: siteUrl,
        t: (key, values) => tEmail(key, values),
        redis: getRedisConnection(),
      })
    } catch (error) {
      console.error(
        '[password-reset] request failed:',
        error instanceof Error ? error.message : error,
      )
    }
  })

  return { ...initialRecoveryState, status: 'success' }
}
