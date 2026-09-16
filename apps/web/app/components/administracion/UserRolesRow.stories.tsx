import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UserRolesRow } from './UserRolesRow'

const meta: Meta<typeof UserRolesRow> = {
  component: UserRolesRow,
  decorators: [
    (Story) => (
      <table>
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof UserRolesRow>

export const ReadOnly: Story = { args: { user: demoUsers[0]!, roles: demoRoles } }
export const SaveFailure: Story = {
  args: {
    ...ReadOnly.args,
    onSaveRoles: async () => {
      throw new Error('Simulated failure')
    },
  },
}
export const Saving: Story = {
  args: { ...ReadOnly.args, onSaveRoles: () => new Promise<void>(() => {}) },
}
