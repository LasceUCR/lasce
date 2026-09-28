import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumTile } from './AlbumTile'

const meta: Meta<typeof AlbumTile> = {
  component: AlbumTile,
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

type Story = StoryObj<typeof AlbumTile>

export const Cover: Story = {
  args: {
    title: 'Fotos del ROSAC',
    meta: '5 subálbumes · 108 archivos · 2019–2023',
    variant: 'cover',
    href: '/galeria/rosac',
    src: '/images/galeria/rosac/8.jpg',
  },
}

/** A group that has no album page yet: the same tile, without a link. */
export const CoverWithoutLink: Story = {
  args: {
    title: 'Fotos del ROSAC',
    meta: '5 subálbumes · 108 archivos · 2019–2023',
    variant: 'cover',
  },
}

export const SubAlbum: Story = {
  args: {
    title: 'Trabajos previos al montaje',
    meta: '2 archivos',
    src: '/images/galeria/rosac/3.jpg',
  },
}
