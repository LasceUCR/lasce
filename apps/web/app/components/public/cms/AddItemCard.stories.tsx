import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AddItemCard } from './AddItemCard'

const meta: Meta<typeof AddItemCard> = {
  component: AddItemCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof AddItemCard>

export const Closed: Story = {
  args: {
    label: 'Agregar noticia',
    children: ({ close }) => (
      <div style={{ padding: '20px' }}>
        <p>Formulario de ejemplo</p>
        <button onClick={close} type="button">
          Cerrar
        </button>
      </div>
    ),
  },
}
