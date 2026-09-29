import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { collaborationsContent } from '@/app/lib/collaborations'
import { researchCollaborations } from '@/app/lib/research-collaborations'

import { CollaborationsPage } from './CollaborationsPage'

const meta: Meta<typeof CollaborationsPage> = {
  component: CollaborationsPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof CollaborationsPage>

export const Default: Story = {
  args: { content: collaborationsContent, collaborations: researchCollaborations },
}
