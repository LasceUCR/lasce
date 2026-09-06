import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { nosotrosContent } from '@/app/lib/nosotros'

import { NosotrosPage } from './NosotrosPage'

const meta: Meta<typeof NosotrosPage> = {
  component: NosotrosPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof NosotrosPage>

export const Default: Story = {
  args: { content: nosotrosContent },
}

/** What the page looks like once LASCE approves the copy and the `flag` key is removed. */
export const ApprovedCopy: Story = {
  args: { content: { ...nosotrosContent, flag: undefined } },
}

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'nosotrosMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        nosotrosMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
