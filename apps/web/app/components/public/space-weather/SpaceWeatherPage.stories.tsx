import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SpaceWeatherPage } from './SpaceWeatherPage'

const meta: Meta<typeof SpaceWeatherPage> = {
  component: SpaceWeatherPage,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof SpaceWeatherPage>

export const Default: Story = {}
