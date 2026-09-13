import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { demoUsers } from '@/app/lib/user-overview-demo'
import { UserDetailsDialog } from './UserDetailsDialog'

const meta: Meta<typeof UserDetailsDialog> = { component: UserDetailsDialog }
export default meta
type Story = StoryObj<typeof UserDetailsDialog>

export const Default: Story = { args: { user: demoUsers[0]!, onClose: () => {} } }
export const MissingDetails: Story = { args: { ...Default.args, user: demoUsers[3]! } }
