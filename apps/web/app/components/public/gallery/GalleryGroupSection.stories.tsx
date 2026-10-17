import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryGroupSection } from './GalleryGroupSection'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import type { GalleryAlbum, GalleryMedia } from '@/app/lib/gallery'

const sampleMedia: GalleryMedia = {
  id: 'story-media',
  title: 'Montaje de la antena',
  description: 'Registro del montaje del observatorio.',
  alt: 'Estructura de antena durante los trabajos de montaje.',
  date: '2024',
  format: 'JPG',
  uploader: 'LASCE',
  isVideo: false,
  colSpan: 1,
  rowSpan: 1,
  src: '/images/galeria/rosac/1.jpg',
}

const albumWithSubAlbums: GalleryAlbum = {
  slug: 'rosac',
  title: 'Fotos del ROSAC',
  description: 'Documentación fotográfica del observatorio.',
  years: '2019–2023',
  src: '/images/galeria/rosac/8.jpg',
  subAlbums: [
    {
      slug: 'montaje',
      title: 'Montaje de la estructura',
      description: 'Registro del montaje.',
      src: '/images/galeria/rosac/montaje/1.jpeg',
      media: [sampleMedia],
    },
  ],
  media: [sampleMedia],
}

const meta: Meta<typeof GalleryGroupSection> = {
  component: GalleryGroupSection,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: false, setEditMode: () => undefined }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof GalleryGroupSection>

export const WithSubAlbums: Story = {
  args: { album: albumWithSubAlbums },
}

const albumWithoutSubAlbums: GalleryAlbum = {
  slug: 'rosac-resumen',
  title: 'Resumen del ROSAC',
  description: 'Registro general de las instalaciones del observatorio.',
  years: '2024',
  src: '/images/galeria/rosac/1.jpg',
  subAlbums: [],
  media: [sampleMedia],
}

/** An album with no children: the cover tile takes the full width. */
export const WithoutSubAlbums: Story = {
  args: { album: albumWithoutSubAlbums },
}
