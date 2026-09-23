import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SuviPreview } from './SuviPreview'

const meta: Meta<typeof SuviPreview> = {
  component: SuviPreview,
}

export default meta

type Story = StoryObj<typeof SuviPreview>

export const Default: Story = {
  args: {
    satellite: 'g19',
    channels: ['fe093', 'fe131', 'fe171', 'fe195', 'fe284', 'he303'],
  },
}
