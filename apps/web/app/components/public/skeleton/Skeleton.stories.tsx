import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Skeleton, SkeletonText } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  component: Skeleton,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '420px', padding: '24px', background: 'var(--white)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof Skeleton>

/** A box, full width by default. */
export const Block: Story = { args: { height: 120 } }

/** One line of text. */
export const TextLine: Story = { args: { shape: 'text', width: '70%' } }

export const Circle: Story = { args: { shape: 'circle', width: 48 } }

/** Sized by its proportions, as an image of unknown width is. */
export const SquareImage: Story = { args: { aspectRatio: '1 / 1', width: 200 } }

/** On a dark frame, such as a solar image's. */
export const Dark: Story = {
  args: { aspectRatio: '1 / 1', width: 200, tone: 'dark' },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', background: 'var(--space-black)' }}>
        <Story />
      </div>
    ),
  ],
}

/** A paragraph, the last line shorter. */
export const Paragraph: StoryObj<typeof SkeletonText> = {
  render: (args) => <SkeletonText {...args} />,
  args: { lines: 4 },
}
