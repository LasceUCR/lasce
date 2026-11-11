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

/** 0.1–0.8 nm X-ray flux with an M3.4 flare: log scale, class letters and the peak's class. */
export const XrayFlare: Story = {
  args: {
    label: 'Flujo solar: rayos X',
    caption: 'Observaciones de GOES.',
    unit: 'W/m²',
    chartStyle: { scale: 'log', flareClasses: true },
    points: [
      { timestamp: '2026-11-05T08:00:00Z', value: 2.1e-7 },
      { timestamp: '2026-11-05T08:15:00Z', value: 4.2e-7 },
      { timestamp: '2026-11-05T08:30:00Z', value: 3.35e-5 },
      { timestamp: '2026-11-05T08:45:00Z', value: 6.1e-6 },
      { timestamp: '2026-11-05T09:00:00Z', value: 8.4e-7 },
    ],
  },
}
