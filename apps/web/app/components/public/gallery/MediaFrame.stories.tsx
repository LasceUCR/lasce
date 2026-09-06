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
    src: '/images/galeria/antena-grua-plato.jpg',
    alt: 'Grúa colocando el reflector principal sobre el pedestal',
    placeholder: 'Foto: Ensamblaje del reflector parabólico',
  },
}

export const Placeholder: Story = {
  args: {
    alt: 'Cimentación de la plataforma',
    placeholder: 'Foto: Cimentación de la plataforma',
  },
}

export const VideoPlaceholder: Story = {
  args: {
    alt: 'Ensamblaje del reflector parabólico',
    placeholder: 'Video: Ensamblaje del reflector parabólico',
  },
}
