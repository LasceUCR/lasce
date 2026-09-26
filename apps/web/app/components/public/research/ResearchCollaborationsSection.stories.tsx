import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchCollaborationsSection } from './ResearchCollaborationsSection'
import { researchCollaborations } from '@/app/lib/research-collaborations'

const meta: Meta<typeof ResearchCollaborationsSection> = {
  component: ResearchCollaborationsSection,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof ResearchCollaborationsSection>

export const Default: Story = {
  args: {
    id: 'research-collaborations',
    collaborations: researchCollaborations,
  },
}

export const Empty: Story = {
  args: {
    id: 'research-collaborations-empty',
    collaborations: [],
  },
}
