import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { LOGIN_HREF } from '@/app/lib/auth/login'
import {
  PASSWORD_RECOVERY_PATH,
  initialRecoveryState,
  recoveryMessages,
  type RecoveryState,
} from '@/app/lib/auth/password-reset'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import es from '@/messages/es.json' with { type: 'json' }

import { PasswordRecoveryForm, type PasswordRecoveryFormProps } from './PasswordRecoveryForm'
import { Default, InvalidEmail, Sent } from './PasswordRecoveryForm.stories'

const copy = es.auth.passwordReset.request
const defaultArgs = Default.args as PasswordRecoveryFormProps
const invalidArgs = InvalidEmail.args as PasswordRecoveryFormProps
const sentArgs = Sent.args as PasswordRecoveryFormProps

const emailField = () => screen.getByLabelText(copy.labels.email, { exact: true })

describe('PasswordRecoveryForm', () => {
  test('asks for the email address and links back to sign in', () => {
    renderWithIntl(<PasswordRecoveryForm {...defaultArgs} />)

    expect(emailField()).toHaveAttribute('type', 'email')
    expect(emailField()).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByRole('button', { name: copy.submit })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('link', { name: copy.backToLogin })).toHaveAttribute('href', LOGIN_HREF)
  })

  test('submits the address and shows the same confirmation for any valid one', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async (): Promise<RecoveryState> => ({
      ...initialRecoveryState,
      status: 'success',
    }))
    renderWithIntl(<PasswordRecoveryForm {...defaultArgs} action={action} />)

    await user.type(emailField(), 'nadie@ucr.ac.cr')
    await user.click(screen.getByRole('button', { name: copy.submit }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const [, formData] = action.mock.calls[0] as unknown as [RecoveryState, FormData]
    expect(Object.fromEntries(formData.entries())).toEqual({ email: 'nadie@ucr.ac.cr' })

    const heading = await screen.findByRole('heading', { name: copy.successTitle })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(copy.successBody)
  })

  test('disables the button while the request runs', async () => {
    const user = userEvent.setup()
    const action = vi.fn(() => new Promise<RecoveryState>(() => {}))
    renderWithIntl(<PasswordRecoveryForm {...defaultArgs} action={action} />)

    await user.click(screen.getByRole('button', { name: copy.submit }))

    expect(await screen.findByRole('button', { name: copy.submitting })).toBeDisabled()
  })

  test('shows a malformed address next to the field and keeps it', () => {
    renderWithIntl(<PasswordRecoveryForm {...invalidArgs} />)

    expect(emailField()).toHaveAttribute('aria-invalid', 'true')
    expect(emailField()).toHaveAccessibleDescription(recoveryMessages.emailInvalid)
    expect(emailField()).toHaveValue('ana@')
  })

  test('offers to sign in or to request another link once sent', () => {
    renderWithIntl(<PasswordRecoveryForm {...sentArgs} />)

    expect(screen.getByText(copy.successHint)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: copy.backToLogin })).toHaveAttribute('href', LOGIN_HREF)
    expect(screen.getByRole('link', { name: copy.retry })).toHaveAttribute(
      'href',
      PASSWORD_RECOVERY_PATH,
    )
    expect(screen.queryByLabelText(copy.labels.email)).not.toBeInTheDocument()
  })

  test('renders in English', () => {
    renderWithIntl(<PasswordRecoveryForm {...defaultArgs} />, { locale: 'en' })
    expect(screen.getByRole('button', { name: 'Send link' })).toBeInTheDocument()
  })
})
