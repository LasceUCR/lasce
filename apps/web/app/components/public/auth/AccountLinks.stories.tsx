import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccountLinks } from './AccountLinks'

const meta: Meta<typeof AccountLinks> = {
  component: AccountLinks,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, context) => (
      <div className={context.args.variant === 'header' ? 'header-actions' : 'mobile-menu-story'}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof AccountLinks>

export const SignedOutHeader: Story = {
  args: {
    variant: 'header',
    account: null,
    pathname: '/',
    isSigningOut: false,
    onSignOut: () => {},
  },
}

export const SignedInHeader: Story = {
  args: {
    ...SignedOutHeader.args,
    account: 'Ana Pérez Rojas',
    pathname: '/cuenta',
  },
}

export const SigningOutHeader: Story = {
  args: {
    ...SignedInHeader.args,
    isSigningOut: true,
  },
}

export const SignedOutMobile: Story = {
  args: {
    ...SignedOutHeader.args,
    variant: 'mobile',
    pathname: '/acceso',
    onNavigate: () => {},
  },
}

export const SignedInMobile: Story = {
  args: {
    ...SignedOutMobile.args,
    account: 'Ana Pérez Rojas',
    pathname: '/',
  },
}
