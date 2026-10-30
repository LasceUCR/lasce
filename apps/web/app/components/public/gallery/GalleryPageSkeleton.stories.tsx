import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GalleryPageSkeleton } from './GalleryPageSkeleton'

const meta: Meta<typeof GalleryPageSkeleton> = { component: GalleryPageSkeleton }
export default meta

type Story = StoryObj<typeof GalleryPageSkeleton>

export const Default: Story = {}
