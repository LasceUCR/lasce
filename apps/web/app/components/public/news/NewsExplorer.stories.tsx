import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsExplorer } from './NewsExplorer'
import { news } from '@/app/lib/news'

const meta: Meta<typeof NewsExplorer> = {
  component: NewsExplorer,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof NewsExplorer>

export const Default: Story = {
  args: {
    news,
  },
}

export const Empty: Story = {
  args: {
    news: [],
  },
}
