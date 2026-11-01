import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SuviImageSequence } from './SuviImageSequence'

const meta: Meta<typeof SuviImageSequence> = { component: SuviImageSequence }
export default meta
type Story = StoryObj<typeof SuviImageSequence>

// Local fixture avoids making Storybook depend on an expiring NOAA archive URL.
export const Default: Story = {
  args: {
    images: [
      {
        timestamp: '2026-09-10T08:30:00Z',
        imageUrl: '/images/decorative/Solar-Flare.png',
      },
    ],
    productName: 'Imágenes solares: 171 Å (Fe171)',
    satellite: 19,
  },
}

export const UnavailableImage: Story = {
  args: {
    ...Default.args,
    images: [{ ...Default.args!.images![0]!, imageUrl: '/unavailable-solar-image.png' }],
  },
}

export const MultipleImages: Story = {
  args: {
    ...Default.args,
    images: [
      Default.args!.images![0]!,
      { ...Default.args!.images![0]!, timestamp: '2026-09-10T08:45:00Z' },
      { ...Default.args!.images![0]!, timestamp: '2026-09-10T09:00:00Z' },
    ],
  },
}
