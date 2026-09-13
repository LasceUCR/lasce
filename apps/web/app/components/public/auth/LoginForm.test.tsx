import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import {
  LOGIN_LABELS,
  REGISTRATION_HREF,
  initialLoginState,
  loginFormCopy,
  loginMessages,
  type LoginState,
} from '@/app/lib/auth/login'

import { LoginForm, type LoginFormProps } from './LoginForm'
import {
  Default,
  Failed,
  InvalidCredentials,
  MissingFields,
  WithHeading,
  WithNext,
  WithNotice,
} from './LoginForm.stories'

const defaultArgs = Default.args as LoginFormProps
const withNextArgs = WithNext.args as LoginFormProps
const withNoticeArgs = WithNotice.args as LoginFormProps
const withHeadingArgs = WithHeading.args as LoginFormProps
const missingFieldsArgs = MissingFields.args as LoginFormProps
const invalidCredentialsArgs = InvalidCredentials.args as LoginFormProps
const failedArgs = Failed.args as LoginFormProps

const control = (label: string) => screen.getByLabelText(label, { exact: true })
const submitButton = () => screen.getByRole('button', { name: loginFormCopy.submit })

describe('LoginForm', () => {
  test('renders the two fields in order, the submit button and the registration link', () => {
    render(<LoginForm {...defaultArgs} />)

    const labels = screen
      .getAllByText((_, element) => element?.tagName === 'LABEL')
      .map((label) => label.textContent)

    expect(labels).toEqual([LOGIN_LABELS.email, LOGIN_LABELS.password])
    expect(control(LOGIN_LABELS.email)).toHaveAttribute('type', 'email')
    expect(control(LOGIN_LABELS.password)).toHaveAttribute('type', 'password')
    expect(control(LOGIN_LABELS.password)).toHaveValue('')
    expect(submitButton()).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('link', { name: loginFormCopy.noAccountLink })).toHaveAttribute(
      'href',
      REGISTRATION_HREF,
    )
    expect(screen.getByText(loginFormCopy.footnote)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('submits the email, the password and the return path to the action', async () => {
    const user = userEvent.setup()
    const result: LoginState = {
      status: 'error',
      values: { email: 'ana@ucr.ac.cr' },
      fieldErrors: {},
      formError: loginMessages.invalidCredentials,
    }
    const action = vi.fn().mockResolvedValue(result)
    render(<LoginForm {...withNextArgs} action={action} />)

    await user.type(control(LOGIN_LABELS.email), 'ana@ucr.ac.cr')
    await user.type(control(LOGIN_LABELS.password), 'una contraseña')
    await user.click(submitButton())

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const [previousState, formData] = action.mock.calls[0] as [LoginState, FormData]
    expect(previousState).toEqual(initialLoginState)
    expect(Object.fromEntries(formData.entries())).toEqual({
      email: 'ana@ucr.ac.cr',
      password: 'una contraseña',
      next: withNextArgs.next,
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(loginMessages.invalidCredentials)
    expect(control(LOGIN_LABELS.email)).toHaveValue('ana@ucr.ac.cr')
  })

  test('disables the button and announces the pending state while the action runs', async () => {
    const user = userEvent.setup()
    const action = vi.fn(() => new Promise<LoginState>(() => {}))
    render(<LoginForm {...defaultArgs} action={action} />)

    await user.click(submitButton())

    const button = await screen.findByRole('button', { name: loginFormCopy.submitting })
    expect(button).toBeDisabled()
    expect(button.closest('form')).toHaveAttribute('aria-busy', 'true')
  })

  test('shows the notice as a status message, not an alert', () => {
    render(<LoginForm {...withNoticeArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(loginMessages.authRequired)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows the optional card heading', () => {
    render(<LoginForm {...withHeadingArgs} />)

    expect(
      screen.getByRole('heading', { level: 2, name: withHeadingArgs.heading?.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(withHeadingArgs.heading?.description ?? '')).toBeInTheDocument()
  })

  test('names both missing fields and summarises the problem in an alert', () => {
    render(<LoginForm {...missingFieldsArgs} />)

    expect(screen.getByRole('alert')).toHaveTextContent(loginMessages.reviewFields)
    expect(control(LOGIN_LABELS.email)).toHaveAttribute('aria-invalid', 'true')
    expect(control(LOGIN_LABELS.email)).toHaveAccessibleDescription(loginMessages.emailRequired)
    expect(control(LOGIN_LABELS.password)).toHaveAttribute('aria-invalid', 'true')
    expect(control(LOGIN_LABELS.password)).toHaveAccessibleDescription(
      loginMessages.passwordRequired,
    )
  })

  test('reports bad credentials without pointing at either field', () => {
    render(<LoginForm {...invalidCredentialsArgs} />)

    expect(screen.getByRole('alert')).toHaveTextContent(loginMessages.invalidCredentials)
    expect(control(LOGIN_LABELS.email)).not.toHaveAttribute('aria-invalid')
    expect(control(LOGIN_LABELS.password)).not.toHaveAttribute('aria-invalid')
    expect(control(LOGIN_LABELS.email)).toHaveValue(
      invalidCredentialsArgs.initialState?.values.email,
    )
    expect(control(LOGIN_LABELS.password)).toHaveValue('')
  })

  test('shows an unexpected failure in the alert', () => {
    render(<LoginForm {...failedArgs} />)

    expect(screen.getByRole('alert')).toHaveTextContent(loginMessages.unexpected)
  })
})
