import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryGroupSection } from './GalleryGroupSection'
import { galleryAlbums } from '@/app/lib/gallery'

const meta: Meta<typeof GalleryGroupSection> = {
  component: GalleryGroupSection,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof GalleryGroupSection>

export const WithSubAlbums: Story = {
  args: { album: galleryAlbums.rosac },
}

/** An album with no children: the cover tile takes the full width. */
export const WithoutSubAlbums: Story = {
  args: { album: galleryAlbums.eclipse },
}
