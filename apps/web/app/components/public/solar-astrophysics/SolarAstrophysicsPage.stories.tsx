import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { solarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarAstrophysicsPage } from './SolarAstrophysicsPage'

const meta: Meta<typeof SolarAstrophysicsPage> = {
  component: SolarAstrophysicsPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof SolarAstrophysicsPage>

export const Default: Story = {
  args: { content: solarAstrophysicsContent },
}
