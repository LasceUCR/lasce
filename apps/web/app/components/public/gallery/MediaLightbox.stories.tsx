import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MediaLightbox } from './MediaLightbox'

const meta: Meta<typeof MediaLightbox> = {
  component: MediaLightbox,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof MediaLightbox>

export const Photograph: Story = {
  args: {
    albumTitle: 'Construcción del ROSAC',
    item: {
      id: 'm1',
      title: 'Llegada de los componentes del ROSAC',
      description: 'Descarga del contenedor con las piezas del reflector principal.',
      date: '15 ene 2025',
      format: 'JPG',
      uploader: 'Andrés Solano',
      isVideo: false,
      colSpan: 2,
      rowSpan: 2,
      src: '/images/galeria/antena-nueva-en-espera.jpg',
    },
    onClose: () => {},
    onPrevious: () => {},
    onNext: () => {},
  },
}

export const Video: Story = {
  args: {
    ...Photograph.args,
    item: {
      id: 'm2',
      title: 'Ensamblaje del reflector parabólico',
      description: 'Registro en video del armado de los paneles del reflector.',
      date: '22 ene 2025',
      format: 'MP4',
      uploader: 'Fabián Alvarado',
      isVideo: true,
      colSpan: 2,
      rowSpan: 1,
      src: '/images/galeria/antena-grua-plato.jpg',
    },
  },
}
