import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryGroupSection } from './GalleryGroupSection'

const meta: Meta<typeof GalleryGroupSection> = {
  component: GalleryGroupSection,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof GalleryGroupSection>

export const WithAlbumPage: Story = {
  args: {
    group: {
      id: 'rosac',
      title: 'Construcción del ROSAC',
      description: 'Documentación del ensamblaje y puesta en marcha del ROSAC.',
      meta: '3 subálbumes · 42 archivos · 2025–2026',
      albumSlug: 'rosac',
      subAlbums: [
        { id: 'cimentacion', title: 'Cimentación e instalación de la antena', count: 18 },
        { id: 'receptor', title: 'Pruebas del receptor', count: 14 },
        { id: 'calibracion', title: 'Alineación y calibración', count: 10 },
      ],
    },
  },
}

/** A group whose album has not been published: nothing in it is a link. */
export const WithoutSubAlbums: Story = {
  args: {
    group: {
      id: 'eclipse',
      title: 'Eclipse solar del 8 de abril',
      description: 'Observación y registro del eclipse desde el campus.',
      meta: '16 archivos · abril 2026',
      subAlbums: [],
    },
  },
}
