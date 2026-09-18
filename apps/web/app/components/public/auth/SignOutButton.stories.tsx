import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SignOutButton } from './SignOutButton'

const meta: Meta<typeof SignOutButton> = {
  component: SignOutButton,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof SignOutButton>

export const HeaderPill: Story = {
  args: {
    className: 'login-link',
    onSignOut: () => {},
  },
}

export const SigningOut: Story = {
  args: {
    ...HeaderPill.args,
    isSigningOut: true,
  },
}

export const InForm: Story = {
  args: {
    className: 'button button-secondary',
    submitsForm: true,
  },
  decorators: [
    (Story) => (
      <form action={async () => {}}>
        <Story />
      </form>
    ),
  ],
}
