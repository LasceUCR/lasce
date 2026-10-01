import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccountMenu } from './AccountMenu'

const meta: Meta<typeof AccountMenu> = {
  component: AccountMenu,
  parameters: { layout: 'centered' },
  // The header actions cell gives the trigger its context and the panel its anchor.
  decorators: [
    (Story) => (
      <div className="header-actions">
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof AccountMenu>

export const Visitor: Story = {
  args: {
    account: 'Prueba',
    role: 'VISITOR',
    pathname: '/',
    isSigningOut: false,
    onSignOut: () => {},
  },
}

export const Open: Story = {
  args: { ...Visitor.args, defaultOpen: true },
}

export const Administrator: Story = {
  args: { ...Visitor.args, role: 'ADMIN', defaultOpen: true },
}

export const SigningOut: Story = {
  args: { ...Administrator.args, isSigningOut: true },
}
