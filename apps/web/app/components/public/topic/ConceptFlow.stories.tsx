import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ConceptFlow } from './ConceptFlow'

const meta: Meta<typeof ConceptFlow> = {
  component: ConceptFlow,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof ConceptFlow>

export const Default: Story = {
  args: {
    title: 'Flujo conceptual',
    steps: ['Sol', 'Viento solar', 'Magnetosfera', 'Tierra'],
    caption:
      'La actividad del Sol alimenta el viento solar y, desde ahí, se manifiestan efectos en la Tierra.',
  },
}
