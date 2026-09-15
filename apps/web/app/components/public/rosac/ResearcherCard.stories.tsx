import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { ResearcherCard } from './ResearcherCard'

const meta: Meta<typeof ResearcherCard> = {
  component: ResearcherCard,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearcherCard>

const carolina = rosacInfoContent.team.people[0]
const jelmuth = rosacInfoContent.team.people.find((person) => person.name === 'Jelmuth Rojas')!

export const Default: Story = {
  args: { ...carolina },
}

export const WithoutEmail: Story = {
  args: { ...jelmuth },
}
