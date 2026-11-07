import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { collaborationsContent } from '@/app/lib/collaborations'
import { InitiativeCard } from './InitiativeCard'
import { Edit } from './InitiativeForm.stories'

const meta: Meta<typeof InitiativeCard> = { component: InitiativeCard }
export default meta
type Story = StoryObj<typeof InitiativeCard>
export const WithLogo: Story = { args: { initiative: collaborationsContent.initiatives.items[0]! } }
export const WithoutOptionalFields: Story = {
  args: { initiative: { ...Edit.args!.initiative!, href: undefined } },
}
export const LongDescription: Story = {
  args: { initiative: collaborationsContent.initiatives.items[1]! },
}
