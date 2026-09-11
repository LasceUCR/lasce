import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ExternalLink, Sun } from 'lucide-react'

import { Button } from '../Button'
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
    description:
      'Las manchas, fulguraciones y eyecciones de masa coronal liberan energía al espacio.',
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

export const HorizontalWithAction: Story = {
  parameters: { layout: 'padded' },
  args: {
    title: 'SWAAT',
    description:
      'Analiza eventos solares mediante observaciones de rayos X de GOES y microondas de RSTN. Visualiza y compara su evolución temporal con gráficas estáticas e interactivas.',
    icon: <Sun size={36} strokeWidth={1.6} />,
    layout: 'horizontal',
    headingLevel: 2,
    action: (
      <Button
        href="https://swaat.up.railway.app/"
        external
        icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
      >
        Acceder a SWAAT
      </Button>
    ),
  },
}
