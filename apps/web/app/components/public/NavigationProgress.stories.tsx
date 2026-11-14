import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NavigationProgress } from './NavigationProgress'

const meta: Meta<typeof NavigationProgress> = {
  component: NavigationProgress,
  args: {
    timeoutMs: 15_000,
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof NavigationProgress>

/** At rest: nothing shows until a link to another page is clicked. */
export const Idle: Story = {}

/** A navigation in progress: the bar trickles along the top of the window. */
export const Loading: Story = {
  args: {
    initialState: 'loading',
  },
}
