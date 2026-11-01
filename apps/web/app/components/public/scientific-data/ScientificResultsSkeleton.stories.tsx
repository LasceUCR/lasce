import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScientificResultsSkeleton } from './ScientificResultsSkeleton'

const meta: Meta<typeof ScientificResultsSkeleton> = {
  component: ScientificResultsSkeleton,
  decorators: [
    (Story) => (
      <div className="data-explorer" style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof ScientificResultsSkeleton>

/** While an EXIS or MAG query runs: summary tiles and a chart. */
export const TimeSeries: Story = { args: { visualization: 'time-series' } }

/** While a SUVI query runs: an image grid. */
export const SolarImages: Story = { args: { visualization: 'image-sequence' } }

/** While a ROSAC dynamic spectrum loads: a chart without summary tiles. */
export const DynamicSpectrum: Story = { args: { visualization: 'dynamic-spectrum' } }

export const Mobile: Story = {
  ...SolarImages,
  globals: { viewport: { value: 'resultsMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        resultsMobile: { name: 'Mobile (390px)', styles: { width: '390px', height: '844px' } },
      },
    },
  },
}
