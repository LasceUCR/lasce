import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import {
  initialRecoveryState,
  recoveryMessages,
  type RecoveryAction,
} from '@/app/lib/auth/password-reset'

import { PasswordRecoveryForm } from './PasswordRecoveryForm'

// Every valid address gets the same confirmation, so the story's action always confirms.
const confirm: RecoveryAction = async () => ({ ...initialRecoveryState, status: 'success' })

const meta: Meta<typeof PasswordRecoveryForm> = {
  component: PasswordRecoveryForm,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof PasswordRecoveryForm>

export const Default: Story = {
  args: { action: confirm },
}

export const InvalidEmail: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: { email: 'ana@' },
      fieldErrors: { email: recoveryMessages.emailInvalid },
    },
  },
}

export const Sent: Story = {
  args: {
    ...Default.args,
    initialState: { ...initialRecoveryState, status: 'success' },
  },
}
