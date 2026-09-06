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
    title: 'Llegada de los componentes del ROSAC',
    description: 'Descarga del contenedor con las piezas del reflector principal.',
    date: '15 ene 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
  },
  {
    id: 'm2',
    title: 'Ensamblaje del reflector parabólico',
    description: 'Registro en video del armado de los paneles del reflector.',
    date: '22 ene 2025',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'm3',
    title: 'Cimentación de la plataforma',
    description: 'Vaciado de concreto para la base de la antena.',
    date: '3 feb 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
  },
  {
    id: 'm4',
    title: 'Instalación del mástil de soporte',
    description: 'Colocación del mástil central antes del montaje del reflector.',
    date: '10 feb 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
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
