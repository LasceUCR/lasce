import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import { RoleAssignmentError } from '@/app/lib/user-overview'

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
export const OwnRole: Story = { args: { ...RemoveRole.args, isCurrentUser: true } }
export const Conflict: Story = {
  args: {
    ...Default.args,
    onConfirm: async () => {
      throw new RoleAssignmentError(
        'La información de este usuario cambió. Recarga la página para ver sus roles actuales antes de volver a intentarlo.',
        true,
      )
    },
  },
}
export const SaveFailure: Story = {
  args: {
    ...Default.args,
    onConfirm: async () => {
      throw new Error('Simulated failure')
    },
  },
}
