import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Sun } from 'lucide-react'

import { WorkAreaCard } from './WorkAreaCard'

const meta: Meta<typeof WorkAreaCard> = {
  component: WorkAreaCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof WorkAreaCard>

export const Default: Story = {
  args: {
    title: 'Física solar',
    description: 'Actividad y observaciones',
    href: '/investigacion',
    icon: <Sun size={25} strokeWidth={1.7} />,
  },
}

export const LongDescription: Story = {
  args: {
    title: 'Datos y análisis',
    description: 'Consulta, visualización y descarga de productos científicos',
    href: '/datos',
    icon: <Sun size={25} strokeWidth={1.7} />,
  },
}
