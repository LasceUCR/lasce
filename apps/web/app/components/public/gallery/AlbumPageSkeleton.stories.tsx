import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumPageSkeleton } from './AlbumPageSkeleton'

const meta: Meta<typeof AlbumPageSkeleton> = { component: AlbumPageSkeleton }
export default meta

type Story = StoryObj<typeof AlbumPageSkeleton>

export const TopLevelAlbum: Story = { args: { hasSubAlbums: true } }

/** A sub-album page, which never lists children of its own. */
export const SubAlbum: Story = { args: { hasSubAlbums: false } }
