'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useToast } from '@/app/components/public/toast/ToastProvider'
import {
  PASSWORD_RECOVERY_PATH,
  RESET_TOKEN_PARAM,
  initialResetState,
  type ResetAction,
  type ResetState,
} from '@/app/lib/auth/password-reset'

import { Button } from '../Button'
import { FormField } from './FormField'
import { PasswordRequirements } from './PasswordRequirements'

export interface PasswordResetFormProps {
  /** The Server Action. It arrives as a prop so the component stays presentational. */
  action: ResetAction
  /** The token from the emailed link; travels back through a hidden input. */
  token: string
  /** Where "Solicitar un enlace nuevo" points. */
  recoveryHref?: string
  /** Starting state. The page passes `invalidTokenState` for a link that no longer works. */
  initialState?: ResetState
}

/**
 * The "Elegir una nueva contraseña" card. Two password fields checked against the shared rule,
 * with the messages next to each field. A link that expired, was used or never existed replaces
 * the form with a panel that offers a new one. A successful save redirects, so it never renders
 * here; an unexpected failure is a toast and the form keeps what was typed.
 */
export function PasswordResetForm({
  action,
  token,
  recoveryHref = PASSWORD_RECOVERY_PATH,
  initialState,
}: PasswordResetFormProps) {
  const t = useTranslations('auth.passwordReset.reset')
  const [state, formAction, isPending] = useActionState(action, initialState ?? initialResetState)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const invalidRef = useRef<HTMLHeadingElement>(null)
  const toast = useToast()
  const lastToastIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (lastToastIdRef.current !== null) {
      toast.dismiss(lastToastIdRef.current)
      lastToastIdRef.current = null
    }
    if (state.status === 'error') {
      if (state.formError) lastToastIdRef.current = toast.show('error', state.formError)
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    } else if (state.status === 'invalid-token' && state !== initialState) {
      invalidRef.current?.focus()
    }
  }, [state, toast, initialState])

  if (state.status === 'invalid-token') {
    return (
      <section className="registration-card form-success" role="alert">
        <h2 ref={invalidRef} tabIndex={-1}>
          {t('invalidTitle')}
        </h2>
        <p>{t('invalidBody')}</p>
        <Button fullPageLoad href={recoveryHref} variant="brand">
          {t('requestNew')}
        </Button>
      </section>
    )
  }

  return (
    <section className="registration-card">
      <form
        action={formAction}
        aria-busy={isPending}
        className="registration-form"
        noValidate
        ref={formRef}
      >
        <input defaultValue={token} name={RESET_TOKEN_PARAM} type="hidden" />
        <FormField
          autoComplete="new-password"
          error={state.fieldErrors.password}
          hint={t('passwordHint')}
          label={t('labels.password')}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <PasswordRequirements password={password} />
        <FormField
          autoComplete="new-password"
          error={state.fieldErrors.passwordConfirmation}
          label={t('labels.passwordConfirmation')}
          name="passwordConfirmation"
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required
          type="password"
          value={passwordConfirmation}
        />
        <div className="form-actions">
          <Button className="button-block" disabled={isPending} type="submit" variant="brand">
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </section>
  )
}
