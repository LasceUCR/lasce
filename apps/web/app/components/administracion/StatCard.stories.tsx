import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { StatCard } from './StatCard'

const meta: Meta<typeof StatCard> = {
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof StatCard>

export const Default: Story = {
  args: {
    label: 'Investigadores',
    value: '18',
    tone: 'blue',
  },
}

export const Orange: Story = {
  args: {
    label: 'Descargas / mes',
    value: '1,204',
    tone: 'orange',
  },
}
