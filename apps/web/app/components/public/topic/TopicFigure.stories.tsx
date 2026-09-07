import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TopicFigure } from './TopicFigure'

const meta: Meta<typeof TopicFigure> = {
  component: TopicFigure,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof TopicFigure>

export const Default: Story = {
  args: {
    src: '/images/decorative/Solar-Flare.png',
    alt: 'Fulguración solar en el disco del Sol.',
    caption: 'Las fulguraciones liberan energía hacia el medio interplanetario.',
  },
}
