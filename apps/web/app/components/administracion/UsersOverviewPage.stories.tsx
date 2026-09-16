import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { UsersOverviewPage } from './UsersOverviewPage'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'

const meta: Meta<typeof UsersOverviewPage> = {
  component: UsersOverviewPage,
}

export default meta

type Story = StoryObj<typeof UsersOverviewPage>

export const Demo: Story = {
  args: {
    title: 'Usuarios',
    description: 'Consulta los usuarios registrados y sus roles actuales.',
    users: demoUsers,
    roles: demoRoles,
    isDemo: true,
  },
}

export const Empty: Story = { args: { ...Demo.args, users: [] } }
export const NoRoles: Story = { args: { ...Demo.args, roles: [] } }
