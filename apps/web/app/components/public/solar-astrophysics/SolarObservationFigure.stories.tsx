import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { solarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarObservationFigure } from './SolarObservationFigure'

const meta: Meta<typeof SolarObservationFigure> = {
  component: SolarObservationFigure,
}

export default meta

type Story = StoryObj<typeof SolarObservationFigure>

export const LiveObservation: Story = {
  args: { content: solarAstrophysicsContent.observation },
}
