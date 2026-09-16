import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UserRoleAssignment } from './UserRoleAssignment'

const meta: Meta<typeof UserRoleAssignment> = {
  component: UserRoleAssignment,
  parameters: { nextjs: { appDirectory: true } },
  args: {
    currentUserId: 'demo-2',
    title: 'Usuarios',
    description: 'Consulta los usuarios registrados.',
    users: demoUsers,
    roles: demoRoles,
    saveAction: async ({ roleIds }) => ({ ok: true, roleIds }),
  },
}
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const SaveFailure: Story = { args: { saveAction: async () => ({ ok: false }) } }
