import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { teamContent } from '@/app/lib/team'

import { TeamPage } from './TeamPage'

const meta: Meta<typeof TeamPage> = {
  component: TeamPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof TeamPage>

export const Default: Story = {
  args: { content: teamContent },
}
