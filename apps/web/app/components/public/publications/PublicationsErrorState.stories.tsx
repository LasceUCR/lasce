import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { PublicationsErrorState } from './PublicationsErrorState'

const meta: Meta<typeof PublicationsErrorState> = {
  component: PublicationsErrorState,
  args: {
    message: 'No se pudieron cargar las publicaciones. Inténtelo de nuevo.',
    retryLabel: 'Reintentar',
    onRetry: fn(),
  },
}
export default meta

type Story = StoryObj<typeof PublicationsErrorState>

export const Default: Story = {}
