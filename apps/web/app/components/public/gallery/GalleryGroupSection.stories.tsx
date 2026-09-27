import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryGroupSection } from './GalleryGroupSection'
import { galleryAlbums, type GalleryAlbum } from '@/app/lib/gallery'

const meta: Meta<typeof GalleryGroupSection> = {
  component: GalleryGroupSection,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof GalleryGroupSection>

export const WithSubAlbums: Story = {
  args: { album: galleryAlbums.rosac },
}

const albumWithoutSubAlbums: GalleryAlbum = {
  slug: 'rosac-resumen',
  title: 'Resumen del ROSAC',
  description: 'Registro general de las instalaciones del observatorio.',
  years: '2024',
  src: '/images/galeria/rosac/1.jpg',
  subAlbums: [],
  media: galleryAlbums.rosac.media,
}

/** An album with no children: the cover tile takes the full width. */
export const WithoutSubAlbums: Story = {
  args: { album: albumWithoutSubAlbums },
}
