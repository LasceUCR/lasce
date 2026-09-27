import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { footerContent } from '@/app/lib/footer'

import { PublicFooter } from './PublicFooter'

const meta: Meta<typeof PublicFooter> = {
  component: PublicFooter,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof PublicFooter>

// A fixed year keeps the story, and the test that reuses its args, deterministic.
export const Default: Story = {
  args: { content: footerContent, year: 2026 },
}

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'footerMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        footerMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
