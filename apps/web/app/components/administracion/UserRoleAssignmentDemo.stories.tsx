import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { UserRoleAssignmentDemo } from './UserRoleAssignmentDemo'

const meta: Meta<typeof UserRoleAssignmentDemo> = { component: UserRoleAssignmentDemo }
export default meta
type Story = StoryObj<typeof UserRoleAssignmentDemo>

export const Default: Story = {
  args: { title: 'Usuarios', description: 'Consulta los usuarios y asigna o retira sus roles.' },
}
export const SaveFailure: Story = { args: { ...Default.args, simulateFailure: true } }
