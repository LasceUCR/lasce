'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useToast } from '@/app/components/public/toast/ToastProvider'
import type { CountryOption } from '@/app/lib/auth/countries'
import { LOGIN_HREF } from '@/app/lib/auth/login'
import {
  initialRegistrationState,
  type RegistrationAction,
  type RegistrationState,
} from '@/app/lib/auth/registration'

import { Button } from '../Button'
import { FormField } from './FormField'

export interface RegistrationFormHeading {
  title: string
  description?: string
}

export interface RegistrationFormProps {
  /** The Server Action. It arrives as a prop so the component stays presentational. */
  action: RegistrationAction
  countries: CountryOption[]
  /**
   * Card heading for pages that show this card beside others (the login card).
   * Shown with the form only; the confirmation replaces it once the account exists.
   */
  heading?: RegistrationFormHeading
  /** Element id, so links can target the card on a page that shows several. */
  id?: string
  /** Starting state. Stories and tests use it to render each state directly. */
  initialState?: RegistrationState
}

/**
 * The "Crear cuenta" card. Renders the six registration fields, echoes the
 * server's validation result, and replaces itself with a confirmation once the
 * account exists. Native validation is off so every message comes from the
 * shared schema, identically with or without JavaScript.
 */
export function RegistrationForm({
  action,
  countries,
  heading,
  id,
  initialState,
}: RegistrationFormProps) {
  const t = useTranslations('auth.registration')
  const [state, formAction, isPending] = useActionState(
    action,
    initialState ?? initialRegistrationState,
  )
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)
  const toast = useToast()
  const lastToastIdRef = useRef<number | null>(null)

  // Move focus to the outcome of a submission so keyboard and screen-reader
  // users land on the first invalid field (or the confirmation) instead of a reset form.
  useEffect(() => {
    if (state.status === 'error') {
      if (lastToastIdRef.current !== null) {
        toast.dismiss(lastToastIdRef.current)
        lastToastIdRef.current = null
      }
      if (state.formError) {
        lastToastIdRef.current = toast.show('error', state.formError)
      }
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    } else if (state.status === 'success') {
      if (lastToastIdRef.current !== null) {
        toast.dismiss(lastToastIdRef.current)
        lastToastIdRef.current = null
      }
      successRef.current?.focus()
    }
  }, [state, toast])

  const headingBlock = heading ? (
    <div className="registration-heading">
      <h2>{heading.title}</h2>
      {heading.description ? (
        <p className="registration-description">{heading.description}</p>
      ) : null}
    </div>
  ) : null

  if (state.status === 'success') {
    return (
      <section className="registration-card form-success" id={id} role="status">
        <h2 ref={successRef} tabIndex={-1}>
          {t('successTitle')}
        </h2>
        <p>{t('successBody')}</p>
        {/* The tab selector keeps its selection across client-side navigations, so this
            link loads the page fresh on the login tab, which also resets this card. */}
        <Button fullPageLoad href={LOGIN_HREF} variant="brand">
          {t('successLink')}
        </Button>
      </section>
    )
  }

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
  }))

  return (
    <section className="registration-card" id={id}>
      {headingBlock}
      <form
        action={formAction}
        aria-busy={isPending}
        className="registration-form"
        noValidate
        ref={formRef}
      >
        <p className="form-required-note">{t('requiredNote')}</p>

        <FormField
          autoComplete="name"
          defaultValue={state.values.fullName}
          error={state.fieldErrors.fullName}
          label={t('labels.fullName')}
          name="fullName"
          placeholder={t('placeholders.fullName')}
          required
        />
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
          autoComplete="organization"
          defaultValue={state.values.institution}
          error={state.fieldErrors.institution}
          label={t('labels.institution')}
          name="institution"
          placeholder={t('placeholders.institution')}
          required
        />
        <FormField
          autoComplete="country"
          defaultValue={state.values.countryCode}
          error={state.fieldErrors.countryCode}
          label={t('labels.countryCode')}
          name="countryCode"
          options={countryOptions}
          placeholder={t('placeholders.countryCode')}
          required
        />
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
