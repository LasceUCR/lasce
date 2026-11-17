import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import es from '@/messages/es.json' with { type: 'json' }

import { FlashToast } from './FlashToast'

// The Storybook preview mounts the ToastProvider, so the toast appears in its region.
const meta: Meta<typeof FlashToast> = {
  component: FlashToast,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof FlashToast>

/** What the access page shows after a password reset. */
export const PasswordReset: Story = {
  args: { message: es.auth.login.resetDone, clearParam: 'restablecida' },
}

export const ErrorTone: Story = {
  args: { message: 'No se pudo completar la operación.', tone: 'error' },
}
