import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LineChart } from './LineChart'

const meta: Meta<typeof LineChart> = {
  component: LineChart,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof LineChart>

export const Default: Story = {
  args: {
    title: 'Actividad geomagnética (últimas 24 h)',
    description: 'El índice Kp subió hasta 3 hacia el mediodía UTC, sin alcanzar el umbral de tormenta.',
    yLabel: 'Índice Kp',
    yMax: 9,
    yTicks: [0, 3, 5, 7, 9],
    threshold: { value: 5, label: 'Umbral de tormenta menor (Kp 5)' },
    points: [
      { label: '00:00', value: 1.3 },
      { label: '06:00', value: 1.8 },
      { label: '12:00', value: 3.0 },
      { label: '18:00', value: 2.2 },
    ],
  },
}
