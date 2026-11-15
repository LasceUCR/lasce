'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { LOGIN_HREF } from '@/app/lib/auth/login'
import {
  PASSWORD_RECOVERY_PATH,
  initialRecoveryState,
  type RecoveryAction,
  type RecoveryState,
} from '@/app/lib/auth/password-reset'

import { Button } from '../Button'
import { FormField } from './FormField'

export interface PasswordRecoveryFormProps {
  /** The Server Action. It arrives as a prop so the component stays presentational. */
  action: RecoveryAction
  /** Where "Volver a iniciar sesión" points; the login tab of the access page by default. */
  loginHref?: string
  /** Starting state. Stories and tests use it to render each state directly. */
  initialState?: RecoveryState
}

/**
 * The "Recuperar contraseña" card: one email field. A valid address always leads to the same
 * confirmation, whether or not it has an account, so the card cannot be used to find out who is
 * registered. Native validation is off so every message comes from the shared schema.
 */
export function PasswordRecoveryForm({
  action,
  loginHref = LOGIN_HREF,
  initialState,
}: PasswordRecoveryFormProps) {
  const t = useTranslations('auth.passwordReset.request')
  const [state, formAction, isPending] = useActionState(
    action,
    initialState ?? initialRecoveryState,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the outcome so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (state.status === 'error') {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    } else if (state.status === 'success') {
      successRef.current?.focus()
    }
  }, [state])

  if (state.status === 'success') {
    return (
      <section className="registration-card form-success" role="status">
        <h2 ref={successRef} tabIndex={-1}>
          {t('successTitle')}
        </h2>
        <p>{t('successBody')}</p>
        <p>{t('successHint')}</p>
        <div className="password-reset-actions">
          <Button fullPageLoad href={loginHref} variant="brand">
            {t('backToLogin')}
          </Button>
          {/* A fresh load resets this card to the empty form. */}
          <Button fullPageLoad href={PASSWORD_RECOVERY_PATH} variant="secondary">
            {t('retry')}
          </Button>
        </div>
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
        <FormField
          autoComplete="email"
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
          label={t('labels.email')}
          name="email"
          placeholder={t('placeholders.email')}
          required
          type="email"
        />
        <div className="form-actions">
          <Button className="button-block" disabled={isPending} type="submit" variant="brand">
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
      <p className="login-alt">
        <a href={loginHref}>{t('backToLogin')}</a>
      </p>
    </section>
  )
}
