import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PasswordRequirements } from './PasswordRequirements'

const meta: Meta<typeof PasswordRequirements> = {
  component: PasswordRequirements,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof PasswordRequirements>

/** Nothing typed yet: every requirement is pending. */
export const Empty: Story = {
  args: { password: '' },
}

/** Long enough and with lowercase letters, but no uppercase letter, number or symbol. */
export const PartlyMet: Story = {
  args: { password: 'contraseña' },
}

/** Every requirement met: the server accepts this password. */
export const AllMet: Story = {
  args: { password: 'Contraseña-2026' },
}
