import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumMediaGrid } from './AlbumMediaGrid'
import type { GalleryMedia } from '@/app/lib/gallery'

/**
 * A four-file slice of the ROSAC album: one of each tile footprint, plus a
 * video, which is what the grid has to lay out and label differently.
 */
const media: GalleryMedia[] = [
  {
    id: 'm1',
    title: 'Adecuación de la base de concreto',
    description:
      'Inspección de la losa de cimentación y preparación del terreno antes del izado de la antena.',
    alt: 'Personas sobre y alrededor de una base de concreto, con una antena al fondo.',
    date: '2024',
    format: 'JPG',
    uploader: 'Equipo ROSAC',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: '/images/galeria/rosac/3.jpg',
  },
  {
    id: 'm2',
    title: 'Elevación de componentes del soporte',
    description:
      'Maniobra de izado de pasarela y soporte metálico hacia la parte superior de la estructura.',
    alt: 'Componente metálico con baranda suspendido junto al soporte de la antena.',
    date: '2024',
    format: 'JPG',
    uploader: 'Equipo ROSAC',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: '/images/galeria/rosac/6.jpg',
  },
  {
    id: 'm3',
    title: 'Trabajos en altura con plataforma elevadora',
    description:
      'Labores de ajuste y fijación en el marco posterior del reflector del radiotelescopio.',
    alt: 'Plataforma elevadora junto a la estructura metálica del reflector.',
    date: '2024',
    format: 'JPG',
    uploader: 'Equipo ROSAC',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: '/images/galeria/rosac/7.jpg',
  },
  {
    id: 'm4',
    title: 'Logística y descarga de componentes',
    description:
      'Traslado y descarga de piezas estructurales metálicas en el sitio del observatorio.',
    alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
    date: '2024',
    format: 'JPG',
    uploader: 'Equipo ROSAC',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: '/images/galeria/rosac/4.jpg',
  },
]

const meta: Meta<typeof AlbumMediaGrid> = {
  component: AlbumMediaGrid,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof AlbumMediaGrid>

export const Default: Story = {
  args: {
    albumTitle: 'Construcción del ROSAC',
    media,
  },
}

/** A single file, to see the grid and the lightbox with nothing to page through. */
export const SingleFile: Story = {
  args: {
    albumTitle: 'Construcción del ROSAC',
    media: media.slice(0, 1),
  },
}

export const Empty: Story = {
  args: {
    albumTitle: 'Categoría sin contenido',
    media: [],
  },
}
