import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacInstrumentForm } from './RosacInstrumentForm'

const meta: Meta<typeof RosacInstrumentForm> = {
  component: RosacInstrumentForm,
  title: 'Public/ROSAC/RosacInstrumentForm',
}

export default meta
type Story = StoryObj<typeof RosacInstrumentForm>

export const EditExisting: Story = {
  args: {
    instrument: {
      id: 'inst-1',
      name: 'Instrumento 1',
      image: {
        src: '/images/ROSAC/construction/Fotogrametria/Fotogrametria_1.jpg',
        alt: 'Instrumento 1',
      },
      consultation: {
        label: 'Consultar simulación del instrumento 1',
        href: '/datos?source=ROSAC&instrument=inst-1',
        notice: 'Resultados simulados.',
      },
    },
    onCancel: fn(),
    onSave: fn(),
  },
}

export const AddNew: Story = {
  args: {
    instrument: null,
    onCancel: fn(),
    onSave: fn(),
  },
}

export const EditDisabled: Story = {
  args: {
    instrument: {
      id: 'rosac-instrument-3',
      name: 'Instrumento 3 (por definir)',
      image: {
        src: '/images/ROSAC/construction/Montaje/montaje_3.jpg',
        alt: 'Instrumento 3',
      },
      consultation: {
        label: 'Consultar simulación del instrumento 3',
        notice: 'Información pendiente de confirmación e integración en la sección de datos.',
      },
    },
    onCancel: fn(),
    onSave: fn(),
  },
}
