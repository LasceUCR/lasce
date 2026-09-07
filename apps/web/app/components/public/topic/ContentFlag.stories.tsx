import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ContentFlag } from './ContentFlag'

const meta: Meta<typeof ContentFlag> = {
  component: ContentFlag,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof ContentFlag>

export const Default: Story = {
  args: {
    label: 'Información provisional',
    message: 'El contenido de esta página es preliminar y está sujeto a revisión.',
  },
}
