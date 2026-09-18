import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DynamicSpectrumChart } from './DynamicSpectrumChart'

const meta: Meta<typeof DynamicSpectrumChart> = { component: DynamicSpectrumChart }
export default meta
type Story = StoryObj<typeof DynamicSpectrumChart>

export const Default: Story = {
  args: {
    label: 'Espectro dinámico simulado de ROSAC',
    caption: 'Espectro dinámico de demostración.',
    frequencyUnit: 'MHz',
    unit: 'intensidad relativa',
    timestamps: ['2026-09-10T08:00:00Z', '2026-09-10T08:10:00Z'],
    frequencies: [100, 200],
    cells: [
      { timestamp: '2026-09-10T08:00:00Z', frequency: 100, value: 12 },
      { timestamp: '2026-09-10T08:00:00Z', frequency: 200, value: 30 },
      { timestamp: '2026-09-10T08:10:00Z', frequency: 100, value: 20 },
      { timestamp: '2026-09-10T08:10:00Z', frequency: 200, value: 42 },
    ],
  },
}
export const Empty: Story = {
  args: { ...Default.args, cells: [], timestamps: [], frequencies: [] },
}
