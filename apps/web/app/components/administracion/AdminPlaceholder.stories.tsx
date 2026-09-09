import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AdminPlaceholder } from './AdminPlaceholder'

const meta: Meta<typeof AdminPlaceholder> = {
  component: AdminPlaceholder,
}

export default meta

type Story = StoryObj<typeof AdminPlaceholder>

export const Default: Story = {
  args: {
    title: 'Descargas',
    description: 'Historial y control de descargas de datos del laboratorio.',
  },
}
