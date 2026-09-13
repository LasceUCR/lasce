import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UserRoleChangeDialog } from './UserRoleChangeDialog'

const meta: Meta<typeof UserRoleChangeDialog> = { component: UserRoleChangeDialog }
export default meta
type Story = StoryObj<typeof UserRoleChangeDialog>
export const Default: Story = {
  args: {
    user: demoUsers[0]!,
    currentRoles: [demoRoles[2]!],
    role: demoRoles[0]!,
    onClose: () => {},
    onConfirm: async () => {},
  },
}
export const RemoveRole: Story = { args: { ...Default.args, role: null } }
export const SaveFailure: Story = {
  args: {
    ...Default.args,
    onConfirm: async () => {
      throw new Error('Simulated failure')
    },
  },
}
