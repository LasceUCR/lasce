import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScientificToolsList } from './ScientificToolsList'
import { scientificTools } from '@/app/lib/scientific-tools'

const meta: Meta<typeof ScientificToolsList> = {
  component: ScientificToolsList,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof ScientificToolsList>

export const Default: Story = {
  args: {
    tools: scientificTools,
  },
}

export const Empty: Story = {
  args: {
    tools: [],
  },
}
