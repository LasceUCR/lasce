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
        alt: 'Imagen solar de demostración del componente',
      },
    ],
  },
}
