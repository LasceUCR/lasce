import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MetricCard } from './MetricCard'

const meta: Meta<typeof MetricCard> = {
  component: MetricCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof MetricCard>

export const Default: Story = {
  args: {
    label: 'Índice Kp',
    value: '3',
    status: 'Inquieto',
    updatedAt: '2 de septiembre de 2026, 12:00 UTC',
    detail: 'Un valor 3 indica inquietud, todavía por debajo de una tormenta.',
    tone: 'teal',
  },
}
