import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumPageSkeleton } from './AlbumPageSkeleton'

const meta: Meta<typeof AlbumPageSkeleton> = {
  component: AlbumPageSkeleton,
  args: {
    kicker: 'Galería LASCE',
    label: 'Cargando álbum…',
    subalbumsTitle: 'Subálbumes',
    mediaTitle: 'Fotografías y video de este álbum',
  },
}
export default meta

type Story = StoryObj<typeof AlbumPageSkeleton>

export const TopLevelAlbum: Story = { args: { hasSubAlbums: true } }

/** A sub-album page, which never lists children of its own. */
export const SubAlbum: Story = { args: { hasSubAlbums: false } }
