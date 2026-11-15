import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { invalidTokenState, resetMessages, type ResetAction } from '@/app/lib/auth/password-reset'

import { PasswordResetForm } from './PasswordResetForm'

// A real reset redirects on success, so the story's action can only answer with a rejection.
const reject: ResetAction = async () => ({
  status: 'error',
  fieldErrors: { passwordConfirmation: resetMessages.confirmationMismatch },
  formError: null,
})

const meta: Meta<typeof PasswordResetForm> = {
  component: PasswordResetForm,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof PasswordResetForm>

export const Default: Story = {
  args: { action: reject, token: 'A'.repeat(43) },
}

export const ValidationErrors: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      fieldErrors: {
        password: resetMessages.passwordTooShort,
        passwordConfirmation: resetMessages.confirmationMismatch,
      },
      formError: null,
    },
  },
}

export const Failed: Story = {
  args: {
    ...Default.args,
    initialState: { status: 'error', fieldErrors: {}, formError: resetMessages.unexpected },
  },
}

/** The link expired, was used already or never existed. */
export const InvalidLink: Story = {
  args: { ...Default.args, token: '', initialState: invalidTokenState },
}
