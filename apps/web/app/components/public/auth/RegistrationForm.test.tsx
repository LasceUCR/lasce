import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { LOGIN_HREF } from '@/app/lib/auth/login'
import {
  REGISTRATION_FIELDS,
  REGISTRATION_LABELS,
  initialRegistrationState,
  registrationFormCopy,
  registrationMessages,
  type RegistrationState,
} from '@/app/lib/auth/registration'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { RegistrationForm, type RegistrationFormProps } from './RegistrationForm'
import {
  Default,
  DuplicateEmail,
  Failed,
  InvalidFormat,
  MissingFields,
  Success,
  WithHeading,
} from './RegistrationForm.stories'

const defaultArgs = Default.args as RegistrationFormProps
const withHeadingArgs = WithHeading.args as RegistrationFormProps
const missingFieldsArgs = MissingFields.args as RegistrationFormProps
const invalidFormatArgs = InvalidFormat.args as RegistrationFormProps
const duplicateEmailArgs = DuplicateEmail.args as RegistrationFormProps
const failedArgs = Failed.args as RegistrationFormProps
const successArgs = Success.args as RegistrationFormProps

function renderForm(ui: React.ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

const control = (label: string) => screen.getByLabelText(label, { exact: true })

describe('RegistrationForm', () => {
  test('renders the six fields in order, the required note and the submit button', () => {
    renderForm(<RegistrationForm {...defaultArgs} />)

    const labels = REGISTRATION_FIELDS.map((field) => REGISTRATION_LABELS[field])
    const rendered = screen
      .getAllByText((_, element) => element?.tagName === 'LABEL')
      .map((label) => label.textContent)

    expect(rendered).toEqual(labels)
    expect(screen.getByText(registrationFormCopy.requiredNote)).toBeInTheDocument()
    expect(control(REGISTRATION_LABELS.email)).toHaveAttribute('type', 'email')
    expect(control(REGISTRATION_LABELS.password)).toHaveAttribute('type', 'password')
    expect(control(REGISTRATION_LABELS.passwordConfirmation)).toHaveAttribute('type', 'password')
    expect(control(REGISTRATION_LABELS.password)).toHaveValue('')
    expect(screen.getAllByRole('option')).toHaveLength(defaultArgs.countries.length + 1)
    expect(screen.getByRole('button', { name: registrationFormCopy.submit })).toHaveAttribute(
      'type',
      'submit',
    )
    expect(document.querySelector('.form-alert')).toBeNull()
  })

  test('shows the optional card heading', () => {
    renderForm(<RegistrationForm {...withHeadingArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: withHeadingArgs.heading?.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(withHeadingArgs.heading?.description ?? '')).toBeInTheDocument()
  })

  test('submits the typed values to the action and shows its result', async () => {
    const user = userEvent.setup()
    const result: RegistrationState = {
      status: 'error',
      values: {
        fullName: 'Ana Pérez',
        email: 'ana@ucr.ac.cr',
        institution: 'UCR',
        countryCode: 'CR',
      },
      fieldErrors: { email: registrationMessages.emailTaken },
      formError: null,
    }
    const action = vi.fn().mockResolvedValue(result)
    renderForm(<RegistrationForm {...defaultArgs} action={action} />)

    await user.type(control(REGISTRATION_LABELS.fullName), 'Ana Pérez')
    await user.type(control(REGISTRATION_LABELS.email), 'ana@ucr.ac.cr')
    await user.type(control(REGISTRATION_LABELS.institution), 'UCR')
    await user.selectOptions(control(REGISTRATION_LABELS.countryCode), 'CR')
    await user.type(control(REGISTRATION_LABELS.password), 'una contraseña')
    await user.type(control(REGISTRATION_LABELS.passwordConfirmation), 'una contraseña')
    await user.click(screen.getByRole('button', { name: registrationFormCopy.submit }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const [previousState, formData] = action.mock.calls[0] as [RegistrationState, FormData]
    expect(previousState).toEqual(initialRegistrationState)
    expect(Object.fromEntries(formData.entries())).toEqual({
      fullName: 'Ana Pérez',
      email: 'ana@ucr.ac.cr',
      institution: 'UCR',
      countryCode: 'CR',
      password: 'una contraseña',
      passwordConfirmation: 'una contraseña',
    })

    expect(document.querySelector('.form-alert')).toBeNull()
    expect(control(REGISTRATION_LABELS.email)).toHaveAccessibleDescription(
      registrationMessages.emailTaken,
    )
    expect(control(REGISTRATION_LABELS.email)).toHaveFocus()
  })

  test('disables the button and announces the pending state while the action runs', async () => {
    const user = userEvent.setup()
    let resolveAction: (state: RegistrationState) => void = () => {}
    const action = vi.fn(
      () =>
        new Promise<RegistrationState>((resolve) => {
          resolveAction = resolve
        }),
    )
    renderForm(<RegistrationForm {...defaultArgs} action={action} />)

    await user.click(screen.getByRole('button', { name: registrationFormCopy.submit }))

    const button = await screen.findByRole('button', { name: registrationFormCopy.submitting })
    expect(button).toBeDisabled()
    expect(button.closest('form')).toHaveAttribute('aria-busy', 'true')

    resolveAction(initialRegistrationState)
  })

  test('names every missing field and focuses the first invalid field without a top alert', () => {
    renderForm(<RegistrationForm {...missingFieldsArgs} />)

    expect(document.querySelector('.form-alert')).toBeNull()
    for (const field of REGISTRATION_FIELDS) {
      const input = control(REGISTRATION_LABELS[field])
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription(
        new RegExp(missingFieldsArgs.initialState?.fieldErrors[field] ?? '$never'),
      )
    }
    expect(control(REGISTRATION_LABELS.fullName)).toHaveFocus()
  })

  test('refills the non-secret fields and leaves the passwords empty after an error', () => {
    renderForm(<RegistrationForm {...invalidFormatArgs} />)
    const values = invalidFormatArgs.initialState?.values

    expect(control(REGISTRATION_LABELS.fullName)).toHaveValue(values?.fullName)
    expect(control(REGISTRATION_LABELS.email)).toHaveValue(values?.email)
    expect(control(REGISTRATION_LABELS.institution)).toHaveValue(values?.institution)
    expect(control(REGISTRATION_LABELS.countryCode)).toHaveValue(values?.countryCode)
    expect(control(REGISTRATION_LABELS.password)).toHaveValue('')
    expect(control(REGISTRATION_LABELS.passwordConfirmation)).toHaveValue('')
    expect(control(REGISTRATION_LABELS.email)).toHaveAccessibleDescription(
      registrationMessages.emailInvalid,
    )
    expect(control(REGISTRATION_LABELS.passwordConfirmation)).toHaveAccessibleDescription(
      registrationMessages.confirmationMismatch,
    )
    expect(control(REGISTRATION_LABELS.email)).toHaveFocus()
  })

  test('points a duplicate email at the email field', () => {
    renderForm(<RegistrationForm {...duplicateEmailArgs} />)

    const email = control(REGISTRATION_LABELS.email)
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(registrationMessages.emailTaken)
    expect(control(REGISTRATION_LABELS.fullName)).not.toHaveAttribute('aria-invalid')
    expect(email).toHaveFocus()
  })

  test('shows an unexpected failure in a toast without marking any field', async () => {
    renderForm(<RegistrationForm {...failedArgs} />)

    expect(document.querySelector('.form-alert')).toBeNull()
    expect(await screen.findByText(registrationMessages.unexpected)).toBeInTheDocument()
    for (const field of REGISTRATION_FIELDS) {
      expect(control(REGISTRATION_LABELS[field])).not.toHaveAttribute('aria-invalid')
    }
  })

  test('shows an error toast when registration fails with a service error', async () => {
    const user = userEvent.setup()
    const result: RegistrationState = {
      status: 'error',
      values: {
        fullName: 'Ana Pérez',
        email: 'ana@ucr.ac.cr',
        institution: 'UCR',
        countryCode: 'CR',
      },
      fieldErrors: {},
      formError: registrationMessages.unexpected,
    }
    const action = vi.fn().mockResolvedValue(result)
    renderForm(<RegistrationForm {...defaultArgs} action={action} />)

    await user.type(control(REGISTRATION_LABELS.fullName), 'Ana Pérez')
    await user.type(control(REGISTRATION_LABELS.email), 'ana@ucr.ac.cr')
    await user.type(control(REGISTRATION_LABELS.institution), 'UCR')
    await user.selectOptions(control(REGISTRATION_LABELS.countryCode), 'CR')
    await user.type(control(REGISTRATION_LABELS.password), 'una contraseña')
    await user.type(control(REGISTRATION_LABELS.passwordConfirmation), 'una contraseña')
    await user.click(screen.getByRole('button', { name: registrationFormCopy.submit }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const [previousState, formData] = action.mock.calls[0] as [RegistrationState, FormData]
    expect(previousState).toEqual(initialRegistrationState)
    expect(formData.get('email')).toBe('ana@ucr.ac.cr')

    expect(await screen.findByText(registrationMessages.unexpected)).toBeInTheDocument()
    expect(document.querySelector('.form-alert')).toBeNull()
  })

  test('replaces the form with the confirmation once the account exists', () => {
    renderForm(<RegistrationForm {...successArgs} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(registrationFormCopy.successTitle)
    expect(
      screen.getByRole('heading', { level: 2, name: registrationFormCopy.successTitle }),
    ).toBeInTheDocument()
    expect(within(status).getAllByRole('heading')).toHaveLength(1)
    expect(
      screen.queryByRole('heading', { name: successArgs.heading?.title }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(successArgs.heading?.description ?? '')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: registrationFormCopy.successLink })
    expect(link).toHaveAttribute('href', LOGIN_HREF)
    expect(link).toHaveAttribute('href', '/acceso?tab=iniciar-sesion')
    expect(
      screen.queryByRole('button', { name: registrationFormCopy.submit }),
    ).not.toBeInTheDocument()
  })
})
