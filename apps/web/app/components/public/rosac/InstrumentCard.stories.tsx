import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInstrumentsContent } from '@/app/lib/rosac-instruments'

import { InstrumentCard } from './InstrumentCard'

const meta: Meta<typeof InstrumentCard> = {
  component: InstrumentCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof InstrumentCard>

export const Simulation: Story = {
  args: { instrument: rosacInstrumentsContent.items[0]! },
}

export const Pending: Story = {
  args: {
    instrument: {
      id: 'pending',
      name: 'Instrumento por definir',
      pendingMessage: 'Información del instrumento pendiente de confirmación.',
    },
  },
}

export const PendingIntegration: Story = {
  args: { instrument: rosacInstrumentsContent.items[2]! },
}

// Demonstration content only. This fixture is never imported by the public page.
export const WithInformation: Story = {
  args: {
    instrument: {
      id: 'example',
      name: 'Instrumento de ejemplo (solo demostración)',
      image: {
        src: '/images/ROSAC/antena-rosac.webp',
        alt: 'Fotografía de ejemplo: antena de ROSAC junto a la caseta de control.',
      },
      purpose: 'Texto de propósito de ejemplo para revisar el diseño.',
      characteristics: ['Característica de ejemplo A', 'Característica de ejemplo B'],
      citation: 'Referencia de ejemplo. Sustituir por el texto aprobado por LASCE.',
    },
  },
}

export const PartialInformation: Story = {
  args: {
    instrument: {
      id: 'partial',
      name: 'Instrumento de ejemplo (información parcial)',
      purpose: 'Propósito de ejemplo; imagen y características aún pendientes.',
    },
  },
}

export const UnavailableImage: Story = {
  args: {
    instrument: {
      ...WithInformation.args!.instrument!,
      image: {
        src: '/images/ROSAC/unavailable-instrument.webp',
        alt: 'Imagen de prueba no disponible',
      },
    },
  },
}
