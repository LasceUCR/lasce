import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArrowLeft, ExternalLink as ExternalLinkIcon } from 'lucide-react'

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

export const ExternalLink: Story = {
  args: {
    children: 'Acceder a SWAAT',
    href: 'https://swaat.up.railway.app',
    target: '_blank',
    rel: 'noopener noreferrer',
    icon: <ExternalLinkIcon aria-hidden="true" size={16} strokeWidth={1.8} />,
  },
}

export const Brand: Story = {
  args: {
    children: 'Crear cuenta',
    variant: 'brand',
    type: 'submit',
  },
}
