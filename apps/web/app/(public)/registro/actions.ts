'use server'

import DuplicateEmailError from '@/app/lib/auth/errors/DuplicateEmailError'
import { hashPassword } from '@/app/lib/auth/password'
import {
  initialRegistrationState,
  readRegistrationInput,
  registrationMessages,
  toEchoValues,
  validateRegistration,
  type RegistrationState,
} from '@/app/lib/auth/registration'
import { createUser } from '@/app/lib/auth/users'

/**
 * Server Action behind the `/registro` form, in the shape `useActionState`
 * expects. Validation, hashing and persistence live in `app/lib/auth`; this only
 * turns their outcomes into the state the form renders. It never throws to the
 * client and never echoes a password back.
 *
 * Kept apart from `app/actions.ts` so registration rules can change without
 * touching unrelated functionality, and outside Vitest coverage on purpose: the
 * Playwright spec `tests/e2e/registro.spec.ts` is what gates it.
 */
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

    // The message, not the input: nothing the visitor typed belongs in a log.
    console.error('[registro] registerUser failed:', error instanceof Error ? error.message : error)
    return {
      status: 'error',
      values,
      fieldErrors: {},
      formError: registrationMessages.unexpected,
    }
  }

  return { ...initialRegistrationState, status: 'success' }
}
