import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PublicationsExplorer } from './PublicationsExplorer'
import { publications } from '@/app/lib/publications'

const meta: Meta<typeof PublicationsExplorer> = {
  component: PublicationsExplorer,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof PublicationsExplorer>

export const Default: Story = {
  args: {
    publications,
  },
}

export const Empty: Story = {
  args: {
    publications: [],
  },
}
