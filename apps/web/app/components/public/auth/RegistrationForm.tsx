'use client'

import { useActionState, useEffect, useRef } from 'react'

import type { CountryOption } from '@/app/lib/auth/countries'
import {
  REGISTRATION_LABELS,
  REGISTRATION_PLACEHOLDERS,
  initialRegistrationState,
  registrationFormCopy,
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
  /** Card heading for pages that show this card beside others (the login card, later). */
  heading?: RegistrationFormHeading
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
  initialState,
}: RegistrationFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState ?? initialRegistrationState,
  )
  const alertRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the outcome of a submission so keyboard and screen-reader
  // users land on the summary (or the confirmation) instead of a reset form.
  useEffect(() => {
    if (state.status === 'error') alertRef.current?.focus()
    if (state.status === 'success') successRef.current?.focus()
  }, [state])

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
      <section className="registration-card form-success" role="status">
        {headingBlock}
        <h2 ref={successRef} tabIndex={-1}>
          {registrationFormCopy.successTitle}
        </h2>
        <p>{registrationFormCopy.successBody}</p>
        <Button href="/" variant="brand">
          {registrationFormCopy.successLink}
        </Button>
      </section>
    )
  }

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
  }))

  return (
    <section className="registration-card">
      {headingBlock}
      <form action={formAction} aria-busy={isPending} className="registration-form" noValidate>
        <p className="form-required-note">{registrationFormCopy.requiredNote}</p>

        {state.formError ? (
          <div className="form-alert" ref={alertRef} role="alert" tabIndex={-1}>
            {state.formError}
          </div>
        ) : null}

        <FormField
          autoComplete="name"
          defaultValue={state.values.fullName}
          error={state.fieldErrors.fullName}
          label={REGISTRATION_LABELS.fullName}
          name="fullName"
          placeholder={REGISTRATION_PLACEHOLDERS.fullName}
          required
        />
        <FormField
          autoComplete="email"
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
          label={REGISTRATION_LABELS.email}
          name="email"
          placeholder={REGISTRATION_PLACEHOLDERS.email}
          required
          type="email"
        />
        <FormField
          autoComplete="organization"
          defaultValue={state.values.institution}
          error={state.fieldErrors.institution}
          label={REGISTRATION_LABELS.institution}
          name="institution"
          placeholder={REGISTRATION_PLACEHOLDERS.institution}
          required
        />
        <FormField
          autoComplete="country"
          defaultValue={state.values.countryCode}
          error={state.fieldErrors.countryCode}
          label={REGISTRATION_LABELS.countryCode}
          name="countryCode"
          options={countryOptions}
          placeholder={REGISTRATION_PLACEHOLDERS.countryCode}
          required
        />
        <FormField
          autoComplete="new-password"
          error={state.fieldErrors.password}
          hint={registrationFormCopy.passwordHint}
          label={REGISTRATION_LABELS.password}
          name="password"
          required
          type="password"
        />
        <FormField
          autoComplete="new-password"
          error={state.fieldErrors.passwordConfirmation}
          label={REGISTRATION_LABELS.passwordConfirmation}
          name="passwordConfirmation"
          required
          type="password"
        />

        <div className="form-actions">
          <Button className="button-block" disabled={isPending} type="submit" variant="brand">
            {isPending ? registrationFormCopy.submitting : registrationFormCopy.submit}
          </Button>
        </div>
      </form>
    </section>
  )
}
