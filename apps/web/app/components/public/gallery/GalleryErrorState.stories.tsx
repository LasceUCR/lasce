import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { GalleryErrorState } from './GalleryErrorState'

const meta: Meta<typeof GalleryErrorState> = {
  component: GalleryErrorState,
  args: { onRetry: fn() },
}
export default meta

type Story = StoryObj<typeof GalleryErrorState>

export const Default: Story = {}
