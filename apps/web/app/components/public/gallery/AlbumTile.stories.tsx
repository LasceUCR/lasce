import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumTile } from './AlbumTile'

const meta: Meta<typeof AlbumTile> = {
  component: AlbumTile,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof AlbumTile>

export const Cover: Story = {
  args: {
    title: 'Construcción del ROSAC',
    meta: '3 subálbumes · 33 archivos · 2025–2026',
    variant: 'cover',
    href: '/galeria/rosac',
    src: '/images/galeria/antena-goldstone-complejo.jpg',
  },
}

/** A group that has no album page yet: the same tile, without a link. */
export const CoverWithoutLink: Story = {
  args: {
    title: 'Eclipse solar del 8 de abril',
    meta: '16 archivos · abril 2026',
    variant: 'cover',
  },
}

export const SubAlbum: Story = {
  args: {
    title: 'Cimentación e instalación de la antena',
    meta: '8 archivos',
    src: '/images/galeria/cimentacion-obra-01.jpg',
  },
}
