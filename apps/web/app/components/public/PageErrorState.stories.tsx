import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { PageErrorState } from './PageErrorState'

const meta: Meta<typeof PageErrorState> = {
  component: PageErrorState,
  args: {
    onRetry: fn(),
  },
}

export default meta

type Story = StoryObj<typeof PageErrorState>

/** A public page that failed to render: the reason, a retry and a way home. */
export const Default: Story = {}
