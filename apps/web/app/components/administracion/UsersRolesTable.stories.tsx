import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UsersRolesTable } from './UsersRolesTable'

const meta: Meta<typeof UsersRolesTable> = { component: UsersRolesTable }
export default meta

type Story = StoryObj<typeof UsersRolesTable>

export const Default: Story = { args: { users: demoUsers, roles: demoRoles } }
export const NoRoles: Story = { args: { ...Default.args, roles: [] } }
export const WithoutAssignments: Story = {
  args: { ...Default.args, users: demoUsers.map((user) => ({ ...user, roleIds: [] })) },
}
