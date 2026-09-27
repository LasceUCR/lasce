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
    position: 1,
    total: 15,
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
  },
}

/** The last file of an album, so the indicator is seen at both ends. */
export const LastFile: Story = {
  args: {
    ...Photograph.args,
    position: 15,
    total: 15,
  },
}
