import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { RosacLocationMap } from './RosacLocationMap'

const meta: Meta<typeof RosacLocationMap> = {
  component: RosacLocationMap,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof RosacLocationMap>

export const Default: Story = {
  args: { location: rosacInfoContent.location },
}
