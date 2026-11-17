import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

import { AccountMenu } from './AccountMenu'

const meta: Meta<typeof AccountMenu> = {
  component: AccountMenu,
  parameters: { layout: 'centered' },
  // The header actions cell gives the trigger its context and the panel its anchor.
  decorators: [
    (Story) => (
      <EditModeProvider>
        <div className="header-actions">
          <Story />
        </div>
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof AccountMenu>

export const Visitor: Story = {
  args: {
    account: 'Prueba',
    role: 'VISITOR',
    canAccessAdmin: false,
    canEdit: false,
    pathname: '/',
    isSigningOut: false,
    onSignOut: () => {},
  },
}

export const Open: Story = {
  args: { ...Visitor.args, defaultOpen: true },
}

export const Administrator: Story = {
  args: { ...Visitor.args, role: 'ADMIN', canAccessAdmin: true, canEdit: true, defaultOpen: true },
}

export const SigningOut: Story = {
  args: { ...Administrator.args, isSigningOut: true },
}
