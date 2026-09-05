import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArrowLeft } from 'lucide-react'

import { Button } from './Button'

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Conoce más sobre LASCE',
    href: '/nosotros',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Volver a las áreas de trabajo',
    href: '/#areas-de-trabajo',
    variant: 'secondary',
    icon: <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />,
  },
}
