import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { RosacInfoPage } from './RosacInfoPage'

const meta: Meta<typeof RosacInfoPage> = {
  component: RosacInfoPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof RosacInfoPage>

export const Default: Story = {
  args: { content: rosacInfoContent },
}

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'rosacMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        rosacMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
