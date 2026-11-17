import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import {
  PASSWORD_RECOVERY_PATH,
  invalidTokenState,
  resetMessages,
  type ResetState,
} from '@/app/lib/auth/password-reset'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import es from '@/messages/es.json' with { type: 'json' }

import { PasswordResetForm, type PasswordResetFormProps } from './PasswordResetForm'
import { Default, Failed, InvalidLink, ValidationErrors } from './PasswordResetForm.stories'

const copy = es.auth.passwordReset.reset
const defaultArgs = Default.args as PasswordResetFormProps

function renderForm(props: PasswordResetFormProps) {
  renderWithIntl(
    <ToastProvider>
      <PasswordResetForm {...props} />
    </ToastProvider>,
  )
  return userEvent.setup()
}

const field = (label: string) => screen.getByLabelText(label, { exact: true })

describe('PasswordResetForm', () => {
  test('asks for the new password twice, with the rule as a hint', () => {
    renderForm(defaultArgs)

    expect(field(copy.labels.password)).toHaveAttribute('type', 'password')
    expect(field(copy.labels.password)).toHaveAttribute('autocomplete', 'new-password')
    expect(field(copy.labels.password)).toHaveAccessibleDescription(copy.passwordHint)
    expect(field(copy.labels.passwordConfirmation)).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: copy.submit })).toBeInTheDocument()
  })

  test('submits the token with both passwords and shows the field errors it gets back', async () => {
    const action = vi.fn(async (): Promise<ResetState> => ({
      status: 'error',
      fieldErrors: { passwordConfirmation: resetMessages.confirmationMismatch },
      formError: null,
    }))
    const user = renderForm({ ...defaultArgs, action })

    await user.type(field(copy.labels.password), 'una clave larga')
    await user.type(field(copy.labels.passwordConfirmation), 'otra clave')
    await user.click(screen.getByRole('button', { name: copy.submit }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const [, formData] = action.mock.calls[0] as unknown as [ResetState, FormData]
    expect(Object.fromEntries(formData.entries())).toEqual({
      token: defaultArgs.token,
      password: 'una clave larga',
      passwordConfirmation: 'otra clave',
    })

    await waitFor(() =>
      expect(field(copy.labels.passwordConfirmation)).toHaveAccessibleDescription(
        resetMessages.confirmationMismatch,
      ),
    )
    expect(field(copy.labels.passwordConfirmation)).toHaveFocus()
    // What was typed stays, so the visitor only fixes the field that is wrong.
    expect(field(copy.labels.password)).toHaveValue('una clave larga')
  })

  test('marks both fields when the password breaks the rule', () => {
    renderForm(ValidationErrors.args as PasswordResetFormProps)

    expect(field(copy.labels.password)).toHaveAttribute('aria-invalid', 'true')
    expect(field(copy.labels.password)).toHaveAccessibleDescription(
      `${copy.passwordHint} ${resetMessages.passwordTooShort}`,
    )
    expect(field(copy.labels.passwordConfirmation)).toHaveAttribute('aria-invalid', 'true')
  })

  test('reports an unexpected failure in a toast', async () => {
    renderForm(Failed.args as PasswordResetFormProps)
    expect(await screen.findByText(resetMessages.unexpected)).toBeInTheDocument()
  })

  test('offers a new link instead of the form when the link no longer works', () => {
    renderForm(InvalidLink.args as PasswordResetFormProps)

    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalidBody)
    expect(screen.getByRole('heading', { name: copy.invalidTitle })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: copy.requestNew })).toHaveAttribute(
      'href',
      PASSWORD_RECOVERY_PATH,
    )
    expect(screen.queryByLabelText(copy.labels.password)).not.toBeInTheDocument()
  })

  test('switches to the new link panel when the token is rejected on submit', async () => {
    const action = vi.fn(async (): Promise<ResetState> => invalidTokenState)
    const user = renderForm({ ...defaultArgs, action })

    await user.type(field(copy.labels.password), 'una clave larga')
    await user.type(field(copy.labels.passwordConfirmation), 'una clave larga')
    await user.click(screen.getByRole('button', { name: copy.submit }))

    const heading = await screen.findByRole('heading', { name: copy.invalidTitle })
    expect(heading).toHaveFocus()
  })
})
