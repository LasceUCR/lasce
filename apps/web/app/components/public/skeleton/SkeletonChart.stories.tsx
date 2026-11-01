import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SkeletonChart } from './SkeletonChart'

const meta: Meta<typeof SkeletonChart> = {
  component: SkeletonChart,
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', background: 'var(--white)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof SkeletonChart>

/** A time-series result: three summary tiles and the chart. */
export const Default: Story = {}

export const ChartOnly: Story = { args: { summaryTiles: 0 } }

export const Mobile: Story = {
  globals: { viewport: { value: 'skeletonMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        skeletonMobile: { name: 'Mobile (390px)', styles: { width: '390px', height: '844px' } },
      },
    },
  },
}
