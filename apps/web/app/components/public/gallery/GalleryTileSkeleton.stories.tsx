import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryTileSkeleton } from './GalleryTileSkeleton'

const meta: Meta<typeof GalleryTileSkeleton> = {
  component: GalleryTileSkeleton,
  parameters: { layout: 'centered' },
  decorators: [
    // The real grid track, so the story shows the card at the size it ships at.
    (Story) => (
      <div style={{ width: 260 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof GalleryTileSkeleton>

export const Cover: Story = { args: { variant: 'cover' } }
export const SubAlbum: Story = { args: { variant: 'sub' } }
