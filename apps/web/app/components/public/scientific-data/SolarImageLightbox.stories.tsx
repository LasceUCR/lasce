import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SolarImageLightbox } from './SolarImageLightbox'

const meta: Meta<typeof SolarImageLightbox> = {
  component: SolarImageLightbox,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof SolarImageLightbox>

// Local fixture avoids making Storybook depend on an expiring NOAA archive URL.
export const Default: Story = {
  args: {
    image: {
      timestamp: '2026-09-10T08:30:00Z',
      imageUrl: '/images/decorative/Solar-Flare.png',
      alt: 'Imagen solar de demostración del componente',
    },
    position: 2,
    total: 5,
    onClose: () => {},
    onPrevious: () => {},
    onNext: () => {},
  },
}

/** The first image of a sequence, so the indicator is seen at the start. */
export const FirstImage: Story = {
  args: { ...Default.args, position: 1 },
}
