import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScientificDataChart } from './ScientificDataChart'

const meta: Meta<typeof ScientificDataChart> = { component: ScientificDataChart }
export default meta
type Story = StoryObj<typeof ScientificDataChart>

export const Default: Story = {
  args: {
    label: 'Serie de demostración',
    caption: 'Muestras de prueba del componente.',
    unit: 'nT',
    points: [
      { timestamp: '2026-09-10T08:00:00Z', value: 10 },
      { timestamp: '2026-09-10T08:10:00Z', value: 30 },
      { timestamp: '2026-09-10T09:00:00Z', value: 20 },
    ],
  },
}
export const SinglePoint: Story = {
  args: { ...Default.args, points: Default.args!.points!.slice(0, 1) },
}
export const Empty: Story = { args: { ...Default.args, points: [] } }
