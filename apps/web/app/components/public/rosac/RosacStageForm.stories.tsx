import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacStageForm } from './RosacStageForm'

const meta: Meta<typeof RosacStageForm> = {
  component: RosacStageForm,
  title: 'Public/ROSAC/RosacStageForm',
}

export default meta
type Story = StoryObj<typeof RosacStageForm>

export const Default: Story = {
  args: {
    stage: {
      id: 'stage-1',
      navigationLabel: 'Preparación',
      title: 'Preparación para el montaje',
      description:
        'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
      images: [
        {
          src: '/images/ROSAC/construction/Preparacion/Preparacion_1.jpg',
          alt: 'Montaje de piezas preliminares del radiotelescopio.',
        },
        {
          src: '/images/ROSAC/construction/Preparacion/Preparacion_2.jpg',
          alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
        },
      ],
      editing: {
        content: {
          es: {
            title: 'Preparación para el montaje',
            description:
              'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
          },
          en: {
            title: 'Preparation for assembly',
            description:
              'Prior to the main assembly, site preparation and component works were carried out.',
          },
        },
        isLegacy: false,
        version: '1',
      },
    },
    onCancel: fn(),
    onSave: fn(),
  },
}
