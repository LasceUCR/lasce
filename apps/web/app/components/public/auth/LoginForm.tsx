'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import {
  NEXT_FIELD,
  REGISTRATION_HREF,
  initialLoginState,
  type LoginAction,
  type LoginState,
} from '@/app/lib/auth/login'

import { Button } from '../Button'
import { FormField } from './FormField'

export interface LoginFormHeading {
  title: string
  description?: string
}

export interface LoginFormProps {
  /** The Server Action. It arrives as a prop so the component stays presentational. */
  action: LoginAction
  /** Return path, already validated by the page; travels through a hidden input. */
  next?: string
  /** Informational message, for instance when a protected page sent the visitor here. */
  notice?: string
  /** Where "Crear cuenta" points; the registration card on the same page by default. */
  registerHref?: string
  /** Card heading for pages that show this card beside others. */
  heading?: LoginFormHeading
  /** Element id, so links can target the card on a page that shows several. */
  id?: string
  /** Starting state. Stories and tests use it to render each state directly. */
  initialState?: LoginState
}

/**
 * The "Iniciar sesión" card. Two fields, the return path, and the server's
 * verdict echoed back. A successful submission never renders anything here:
 * the action redirects. Native validation is off so every message comes from
 * the shared schema, identically with or without JavaScript.
 */
export function LoginForm({
  action,
  next,
  notice,
  registerHref = REGISTRATION_HREF,
  heading,
  id,
  initialState,
}: LoginFormProps) {
  const t = useTranslations('auth.login')
  const [state, formAction, isPending] = useActionState(action, initialState ?? initialLoginState)
  const alertRef = useRef<HTMLDivElement>(null)

  // Move focus to the summary after a failed submission so keyboard and
  // screen-reader users land on it instead of a reset form.
  useEffect(() => {
    if (state.status === 'error') alertRef.current?.focus()
  }, [state])

  return (
    <section className="registration-card login-card" id={id}>
      {heading ? (
        <div className="registration-heading">
          <h2>{heading.title}</h2>
          {heading.description ? (
            <p className="registration-description">{heading.description}</p>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}

      <form action={formAction} aria-busy={isPending} className="registration-form" noValidate>
        {state.formError ? (
          <div className="form-alert" ref={alertRef} role="alert" tabIndex={-1}>
            {state.formError}
          </div>
        ) : null}

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
        <FormField
          autoComplete="current-password"
          error={state.fieldErrors.password}
          label={t('labels.password')}
          name="password"
          required
          type="password"
        />
        <input defaultValue={next ?? ''} name={NEXT_FIELD} type="hidden" />

        <div className="form-actions">
          <Button className="button-block" disabled={isPending} type="submit" variant="brand">
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>

      {/* A plain anchor rather than a Link: the tab selector keeps its selection across
          client-side navigations, so the registration tab only opens on a fresh load. */}
      <p className="login-alt">
        {t('noAccountPrompt')} <a href={registerHref}>{t('noAccountLink')}</a>
      </p>
      <p className="login-footnote">{t('footnote')}</p>
    </section>
  )
}
