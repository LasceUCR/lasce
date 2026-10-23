import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SkeletonImageCard } from './SkeletonImageCard'

const meta: Meta<typeof SkeletonImageCard> = { component: SkeletonImageCard }

export default meta

type Story = StoryObj<typeof SkeletonImageCard>

export const Single: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '220px' }}>
        <Story />
      </div>
    ),
  ],
}

export const WithoutCaption: Story = { ...Single, args: { caption: false } }

/** Inside the same grid as the images of a query result. */
export const InImageGrid: Story = {
  render: (args) => (
    <ul className="data-image-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index}>
          <SkeletonImageCard {...args} />
        </li>
      ))}
    </ul>
  ),
}

/** Inside the strip of "Sol hoy": five in a row. */
export const InStrip: Story = {
  render: (args) => (
    <ul className="data-image-grid data-image-strip">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index}>
          <SkeletonImageCard {...args} />
        </li>
      ))}
    </ul>
  ),
}

/** On a phone, the grid falls to one column like the images do. */
export const Mobile: Story = {
  ...InImageGrid,
  globals: { viewport: { value: 'skeletonMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        skeletonMobile: { name: 'Mobile (390px)', styles: { width: '390px', height: '844px' } },
      },
    },
  },
}
