import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MediaTileSkeleton } from './MediaTileSkeleton'

const meta: Meta<typeof MediaTileSkeleton> = {
  component: MediaTileSkeleton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <ul className="media-grid tile-list" style={{ width: 520 }}>
        <Story />
      </ul>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof MediaTileSkeleton>

export const Default: Story = {}
