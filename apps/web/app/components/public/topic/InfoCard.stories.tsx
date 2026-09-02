import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Sun } from 'lucide-react'

import { InfoCard } from './InfoCard'

const meta: Meta<typeof InfoCard> = {
  component: InfoCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof InfoCard>

export const Default: Story = {
  args: {
    title: 'Actividad solar',
    description: 'Las manchas, fulguraciones y eyecciones de masa coronal liberan energía al espacio.',
    icon: <Sun size={22} strokeWidth={1.8} />,
  },
}

export const WithMoreInformation: Story = {
  args: {
    title: 'Telecomunicaciones',
    description: 'Una fulguración C puede causar desvanecimientos breves en HF del lado diurno.',
    more: 'Durante tormentas fuertes, las comunicaciones HF de aviación y emergencia se degradan.',
    icon: <Sun size={22} strokeWidth={1.8} />,
  },
}
