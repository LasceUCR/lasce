import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { GalleryErrorState } from './GalleryErrorState'

const meta: Meta<typeof GalleryErrorState> = {
  component: GalleryErrorState,
  args: {
    message: 'No se pudo cargar la galería. Inténtelo de nuevo.',
    retryLabel: 'Reintentar',
    onRetry: fn(),
  },
}
export default meta

type Story = StoryObj<typeof GalleryErrorState>

export const Default: Story = {}
