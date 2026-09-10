import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { StatusPill } from './StatusPill'

const meta: Meta<typeof StatusPill> = {
  component: StatusPill,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof StatusPill>

export const WithDot: Story = {
  args: {
    label: 'Operativa',
    tone: 'green',
  },
}

export const TextOnly: Story = {
  args: {
    label: 'Programado',
    tone: 'blue',
    showDot: false,
  },
}

export const Orange: Story = {
  args: {
    label: 'En espera',
    tone: 'orange',
  },
}
