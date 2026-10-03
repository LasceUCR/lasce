import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MediaFrame } from './MediaFrame'

const meta: Meta<typeof MediaFrame> = {
  component: MediaFrame,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 200 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof MediaFrame>

export const WithImage: Story = {
  args: {
    src: '/images/galeria/rosac/5.jpg',
    alt: 'Grúa situada sobre un soporte cilíndrico durante los trabajos de montaje.',
    placeholder: 'Foto: Posicionamiento de grúa en soporte central',
  },
}

export const Placeholder: Story = {
  args: {
    alt: 'Adecuación de la base de concreto',
    placeholder: 'Foto: Adecuación de la base de concreto',
  },
}

export const VideoPlaceholder: Story = {
  args: {
    alt: 'Elevación de componentes del soporte',
    placeholder: 'Video: Elevación de componentes del soporte',
  },
}
